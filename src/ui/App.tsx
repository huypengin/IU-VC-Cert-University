import { getEnv } from "../env";
import {
  issueBatch,
  revokeCredentialOnChain,
  type ComponentInput,
} from "../core";
import { buildRevocationRequestFromVc } from "../revocation/request";
import { verifyVC, type VerificationResult } from "../verifier";
import { formatBatchIssuance } from "./batchIssuance";
import { describeChainStatus } from "./chainStatus";
import { fetchPickupOffer, type PickupOfferVm } from "./pickupApi";
import { describeExpiryState } from "./pickupState";
import React, { useEffect, useMemo, useState } from "react";

type DegreeInput = { type: string; name: string };

type IssueFormState = {
  credentialId: string;
  subjectDid: string;
  validFrom: string;
  degree: DegreeInput;
  chainId: string;
  rpcUrl: string;
  components: ComponentInput[];
};

function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type RevokeResult = Awaited<ReturnType<typeof revokeCredentialOnChain>>;
type BatchIssuanceSummary = ReturnType<typeof formatBatchIssuance>;

export default function App() {
  const [activeTab, setActiveTab] = useState<"issue" | "verify" | "pickup">("issue");

  // Issue form state
  const [form, setForm] = useState<IssueFormState>({
    credentialId: "urn:uuid:example-degree-2025",
    subjectDid: "did:example:student123",
    validFrom: isoNow(),
    degree: { type: "BachelorDegree", name: "BSc in Computer Science" },
    chainId: getEnv("CHAIN_ID"),
    rpcUrl: "",
    components: [
      {
        name: "diploma",
        mandatory: true,
        componentType: "degreeCertificate",
        content: "demo-content:diploma",
      },
      {
        name: "transcript",
        mandatory: false,
        componentType: "academicTranscript",
        content: "demo-content:transcript",
      },
    ],
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vc, setVc] = useState<any>(null);
  const [issuedBatch, setIssuedBatch] = useState<BatchIssuanceSummary | null>(null);

  // Verifier state
  const [vcInput, setVcInput] = useState("");
  const [verifyRpcUrl, setVerifyRpcUrl] = useState("");
  const [skipChain, setSkipChain] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [revokeReason, setRevokeReason] = useState("issuer revoked");
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeResult, setRevokeResult] = useState<RevokeResult | null>(null);

  // Wallet pickup state
  const [pickupSubjectId, setPickupSubjectId] = useState("did:example:student123");
  const [pickupBusy, setPickupBusy] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [pickupOffer, setPickupOffer] = useState<PickupOfferVm | null>(null);
  const [pickupExpiresAtMs, setPickupExpiresAtMs] = useState<number | null>(null);
  const [pickupNowMs, setPickupNowMs] = useState(Date.now());

  const canIssue = useMemo(() => {
    return (
      form.credentialId &&
      form.subjectDid &&
      form.validFrom &&
      form.chainId &&
      form.components.length > 0
    );
  }, [form]);

  async function onIssue() {
    setError(null);
    setVc(null);
    setIssuedBatch(null);
    setBusy(true);
    try {
      const result = await issueBatch({
        chainId: form.chainId,
        rpcUrl: form.rpcUrl,
        validFrom: form.validFrom,
        students: [
          {
            studentId: form.subjectDid,
            subjectDid: form.subjectDid,
            credentialId: form.credentialId,
            degree: form.degree,
            components: form.components,
          },
        ],
      });

      setIssuedBatch(formatBatchIssuance(result));
      setVc(result.students[0]?.vc ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setVerifyError(null);
    setVerifyResult(null);
    setVerifying(true);
    try {
      const parsedVc = JSON.parse(vcInput);
      const result = await verifyVC(parsedVc, {
        rpcUrl: verifyRpcUrl || undefined,
        skipChainVerification: skipChain,
        advancedVerification: advancedMode,
      });
      setVerifyResult(result);
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setVerifying(false);
    }
  }

  async function onRevoke() {
    setRevokeError(null);
    setRevokeResult(null);
    setRevoking(true);
    try {
      const parsedVc = JSON.parse(vcInput);
      const request = await buildRevocationRequestFromVc(parsedVc);
      const result = await revokeCredentialOnChain({
        ...request,
        reason: revokeReason,
      });
      setRevokeResult(result);
    } catch (e) {
      setRevokeError(e instanceof Error ? e.message : String(e));
    } finally {
      setRevoking(false);
    }
  }

  useEffect(() => {
    if (!pickupExpiresAtMs) return;
    const timer = window.setInterval(() => setPickupNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pickupExpiresAtMs]);

  const pickupSecondsLeft = useMemo(() => {
    if (!pickupExpiresAtMs) return 0;
    return Math.max(0, Math.ceil((pickupExpiresAtMs - pickupNowMs) / 1000));
  }, [pickupExpiresAtMs, pickupNowMs]);

  const pickupQrSrc = useMemo(() => {
    if (!pickupOffer) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pickupOffer.offerUri)}`;
  }, [pickupOffer]);

  const pickupExpiryState = useMemo(
    () => describeExpiryState(pickupSecondsLeft),
    [pickupSecondsLeft],
  );

  async function onCreatePickupOffer() {
    setPickupError(null);
    setPickupBusy(true);
    try {
      const nextOffer = await fetchPickupOffer(pickupSubjectId.trim() || undefined);
      setPickupOffer(nextOffer);
      setPickupNowMs(Date.now());
      setPickupExpiresAtMs(Date.now() + nextOffer.expiresInSec * 1000);
    } catch (e) {
      setPickupError(e instanceof Error ? e.message : String(e));
    } finally {
      setPickupBusy(false);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>IU-SmartCert (Phase 2 + 3)</h1>
        <p>
          Issue and verify W3C VC v2 credentials with Merkle receipts and on-chain anchoring.
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "issue" ? "active" : ""}`}
          onClick={() => setActiveTab("issue")}
        >
          Issue Credential
        </button>
        <button
          className={`tab ${activeTab === "verify" ? "active" : ""}`}
          onClick={() => setActiveTab("verify")}
        >
          Verify Credential
        </button>
        <button
          className={`tab ${activeTab === "pickup" ? "active" : ""}`}
          onClick={() => setActiveTab("pickup")}
        >
          Wallet Pickup
        </button>
      </div>

      {/* Issue Tab */}
      {activeTab === "issue" && (
        <>
          <div className="grid">
            <section className="card">
              <h2>Credential</h2>
              <label>
                Credential ID
                <input
                  value={form.credentialId}
                  onChange={(e) => setForm((s) => ({ ...s, credentialId: e.target.value }))}
                />
              </label>
              <label>
                Subject DID
                <input
                  value={form.subjectDid}
                  onChange={(e) => setForm((s) => ({ ...s, subjectDid: e.target.value }))}
                />
              </label>
              <label>
                validFrom (ISO)
                <input
                  value={form.validFrom}
                  onChange={(e) => setForm((s) => ({ ...s, validFrom: e.target.value }))}
                />
              </label>

              <h3>Degree</h3>
              <div className="row">
                <label>
                  Type
                  <input
                    value={form.degree.type}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, degree: { ...s.degree, type: e.target.value } }))
                    }
                  />
                </label>
                <label>
                  Name
                  <input
                    value={form.degree.name}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, degree: { ...s.degree, name: e.target.value } }))
                    }
                  />
                </label>
              </div>
            </section>

            <section className="card">
              <h2>Anchoring</h2>
              <label>
                chainId (eip155:...)
                <input
                  value={form.chainId}
                  onChange={(e) => setForm((s) => ({ ...s, chainId: e.target.value }))}
                />
              </label>
              <label>
                rpcUrl (only needed if not using MetaMask)
                <input
                  value={form.rpcUrl}
                  onChange={(e) => setForm((s) => ({ ...s, rpcUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <p className="hint">
                Each issuance batch now deploys a fresh contract and anchors one root once. The issue
                tab still uses a single-student form, but it routes through the batch issuance flow.
              </p>
            </section>

            <section className="card span2">
              <h2>Components</h2>
              <div className="actions">
                <button
                  type="button"
                  onClick={() =>
                    setForm((s) => ({
                      ...s,
                      components: [
                        ...s.components,
                        { name: "", mandatory: false, componentType: "", content: "" },
                      ],
                    }))
                  }
                >
                  Add component
                </button>
              </div>

              <div className="components">
                {form.components.map((c, i) => (
                  <div key={i} className="component">
                    <div className="row">
                      <label>
                        Name
                        <input
                          value={c.name}
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              components: s.components.map((x, idx) =>
                                idx === i ? { ...x, name: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        componentType
                        <input
                          value={c.componentType}
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              components: s.components.map((x, idx) =>
                                idx === i ? { ...x, componentType: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={c.mandatory}
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              components: s.components.map((x, idx) =>
                                idx === i ? { ...x, mandatory: e.target.checked } : x,
                              ),
                            }))
                          }
                        />
                        mandatory
                      </label>
                      <button
                        type="button"
                        className="danger"
                        onClick={() =>
                          setForm((s) => ({ ...s, components: s.components.filter((_, idx) => idx !== i) }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <label>
                      content (demo)
                      <textarea
                        value={c.content}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            components: s.components.map((x, idx) =>
                              idx === i ? { ...x, content: e.target.value } : x,
                            ),
                          }))
                        }
                        rows={2}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="card">
            <div className="actions">
              <button type="button" onClick={onIssue} disabled={!canIssue || busy}>
                {busy ? "Issuing..." : "Issue Batch VC"}
              </button>
              {vc && (
                <button type="button" onClick={() => downloadJson("vc.json", vc)}>
                  Download vc.json
                </button>
              )}
            </div>
            {error && <pre className="error">{error}</pre>}
          </section>

          {issuedBatch && (
            <section className="card">
              <h2>Batch Summary</h2>
              <div className="result-info">Students: {issuedBatch.studentCount}</div>
              <div className="result-info">Components: {issuedBatch.componentCount}</div>
              <div className="result-info">Chain: {issuedBatch.chainId}</div>
              <div className="result-info">Contract: {issuedBatch.contractAddress}</div>
              <div className="result-info">Deployment Tx: {issuedBatch.deploymentTx}</div>
              <div className="result-info">Anchor Tx: {issuedBatch.anchorTx}</div>
              <div className="result-info">Merkle Root: {issuedBatch.merkleRoot}</div>
            </section>
          )}

          {vc && (
            <section className="card">
              <h2>Output</h2>
              <pre className="code">{JSON.stringify(vc, null, 2)}</pre>
            </section>
          )}
        </>
      )}

      {/* Verify Tab */}
      {activeTab === "verify" && (
        <>
          <div className="grid">
            <section className="card span2">
              <h2>Paste VC JSON</h2>
              <textarea
                className="vc-input"
                value={vcInput}
                onChange={(e) => setVcInput(e.target.value)}
                placeholder='{"@context": [...], "type": [...], ...}'
                rows={12}
              />
            </section>

            <section className="card">
              <h2>Verification Options</h2>
              <label>
                RPC URL (optional, uses MetaMask if empty)
                <input
                  value={verifyRpcUrl}
                  onChange={(e) => setVerifyRpcUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={advancedMode}
                  onChange={(e) => setAdvancedMode(e.target.checked)}
                />
                Advanced verification (Merkle + Chain)
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={skipChain}
                  onChange={(e) => setSkipChain(e.target.checked)}
                />
                Skip chain verification
              </label>
            </section>

            <section className="card">
              <div className="actions">
                <button
                  type="button"
                  onClick={onVerify}
                  disabled={!vcInput.trim() || verifying}
                  className="verify-btn"
                >
                  {verifying ? "Verifying..." : "Verify VC"}
                </button>
              </div>
              {verifyError && <pre className="error">{verifyError}</pre>}
            </section>

            <section className="card">
              <h2>Revoke On-Chain</h2>
              <label>
                Revocation reason
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                />
              </label>
              <div className="actions">
                <button
                  type="button"
                  onClick={onRevoke}
                  disabled={!vcInput.trim() || !revokeReason.trim() || revoking}
                  className="danger"
                >
                  {revoking ? "Revoking..." : "Revoke Credential"}
                </button>
              </div>
              {revokeError && <pre className="error">{revokeError}</pre>}
              {revokeResult && (
                <div className="result-info">
                  Revoked on-chain via {revokeResult.contractAddress} on {revokeResult.chainId}. Tx:{" "}
                  {revokeResult.revokeTx}
                </div>
              )}
            </section>
          </div>

          {/* Verification Results */}
          {verifyResult && (
            <section className="card">
              <h2>Verification Results</h2>
              <div className={`result-banner ${verifyResult.valid ? "success" : "failure"}`}>
                {verifyResult.valid ? "✓ Verification Passed" : "✗ Verification Failed"}
                <span className="result-phase">Phase: {verifyResult.phase}</span>
              </div>

              <div className="result-grid">
                {/* Standard Verification */}
                <div className="result-card">
                  <h3>Phase 1: Standard VC</h3>
                  <div className="result-items">
                    <div className={`result-item ${verifyResult.standard.signatureValid ? "pass" : "fail"}`}>
                      <span className="indicator">{verifyResult.standard.signatureValid ? "✓" : "✗"}</span>
                      Signature Valid
                    </div>
                    <div className={`result-item ${verifyResult.standard.issuerValid ? "pass" : "fail"}`}>
                      <span className="indicator">{verifyResult.standard.issuerValid ? "✓" : "✗"}</span>
                      Issuer Valid
                    </div>
                    <div className={`result-item ${verifyResult.standard.temporalValid ? "pass" : "fail"}`}>
                      <span className="indicator">{verifyResult.standard.temporalValid ? "✓" : "✗"}</span>
                      Temporal Valid
                    </div>
                  </div>
                  {verifyResult.standard.error && (
                    <div className="result-error">{verifyResult.standard.error}</div>
                  )}
                </div>

                {/* Merkle Verification */}
                {verifyResult.merkle && (
                  <div className="result-card">
                    <h3>Phase 2: Merkle Proofs</h3>
                    <div className="result-items">
                      <div className={`result-item ${verifyResult.merkle.valid ? "pass" : "fail"}`}>
                        <span className="indicator">{verifyResult.merkle.valid ? "✓" : "✗"}</span>
                        Proofs Valid
                      </div>
                      <div className="result-item info">
                        Components: {verifyResult.merkle.componentsVerified} / {verifyResult.merkle.totalComponents}
                      </div>
                    </div>
                    {verifyResult.receiptSource && (
                      <div className="result-info">Receipt source: {verifyResult.receiptSource}</div>
                    )}
                    {verifyResult.merkle.error && (
                      <div className="result-error">{verifyResult.merkle.error}</div>
                    )}
                  </div>
                )}

                {/* Chain Verification */}
                <div className="result-card">
                  <h3>Phase 2: Chain Anchoring</h3>
                  {verifyResult.chain ? (
                    <div className="result-items">
                      <div
                        className={`result-item ${
                          verifyResult.chain.anchorTxConfirmed ? "pass" : "fail"
                        }`}
                      >
                        <span className="indicator">
                          {verifyResult.chain.anchorTxConfirmed ? "✓" : "✗"}
                        </span>
                        Anchor Confirmed
                      </div>
                      {verifyResult.chain.chainId && (
                        <div className="result-item info">
                          Chain: {verifyResult.chain.chainId}
                        </div>
                      )}
                      {typeof verifyResult.chain.revoked === "boolean" && (
                        <div
                          className={`result-item ${
                            verifyResult.chain.revoked ? "fail" : "pass"
                          }`}
                        >
                          <span className="indicator">
                            {verifyResult.chain.revoked ? "✗" : "✓"}
                          </span>
                          {verifyResult.chain.revoked ? "Revoked On-Chain" : "Not Revoked"}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="result-item info">
                      <span className="indicator">⏩</span>
                      Verification Skipped
                    </div>
                  )}
                  {verifyResult.chain?.error && (
                    <div className="result-error">{verifyResult.chain.error}</div>
                  )}
                  {verifyResult.chain && (
                    <div className="result-info">{describeChainStatus(verifyResult.chain)}</div>
                  )}
                  {verifyResult.chain?.revocationReason && (
                    <div className="result-info">
                      Revocation reason: {verifyResult.chain.revocationReason}
                    </div>
                  )}
                  {verifyResult.chain?.revocationKey && (
                    <div className="result-info">
                      Revocation key: {verifyResult.chain.revocationKey}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Wallet Pickup Tab */}
      {activeTab === "pickup" && (
        <>
          <div className="grid">
            <section className="card">
              <h2>Wallet Pickup</h2>
              <label>
                Subject DID (optional override)
                <input
                  value={pickupSubjectId}
                  onChange={(e) => setPickupSubjectId(e.target.value)}
                  placeholder="did:example:student123"
                />
              </label>
              <div className="pickup-actions">
                <button type="button" onClick={onCreatePickupOffer} disabled={pickupBusy}>
                  {pickupBusy ? "Generating..." : "Add to Wallet"}
                </button>
                {pickupOffer && (
                  <button type="button" onClick={onCreatePickupOffer} disabled={pickupBusy}>
                    Generate new QR
                  </button>
                )}
              </div>
              {pickupError && <pre className="error">{pickupError}</pre>}
              <p className="hint">
                Generate an OID4VCI offer and either open the wallet deep link or scan QR from a phone wallet.
              </p>
            </section>

            {pickupOffer && (
              <section className="card pickup-panel">
                <h2>Offer Ready</h2>
                <div className="pickup-actions">
                  <a href={pickupOffer.offerUri} className="pickup-link-btn">
                    Open Wallet Deep Link
                  </a>
                </div>
                <div className="pickup-qr">
                  <img src={pickupQrSrc} alt="OID4VCI offer QR code" width={240} height={240} />
                </div>
                <p className={`expiry-${pickupExpiryState}`}>Expires in: {pickupSecondsLeft}s</p>
                {pickupSecondsLeft === 0 && (
                  <p className="hint">This offer has expired. Generate a new QR to continue.</p>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
