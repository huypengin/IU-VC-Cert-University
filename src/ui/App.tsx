import {
  HASH_ALG,
  LEAF_ENCODING,
  anchorRoot,
  buildMerkle,
  hashComponents,
  type ComponentInput,
} from "../core";
import { assembleVc, signVc } from "../vc";
import React, { useMemo, useState } from "react";

type DegreeInput = { type: string; name: string };

type IssueFormState = {
  credentialId: string;
  subjectDid: string;
  validFrom: string;
  degree: DegreeInput;
  chainId: string;
  rpcUrl: string;
  contractAddress: string;
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

export default function App() {
  const [form, setForm] = useState<IssueFormState>({
    credentialId: "urn:uuid:example-degree-2025",
    subjectDid: "did:example:student123",
    validFrom: isoNow(),
    degree: { type: "BachelorDegree", name: "BSc in Computer Science" },
    chainId: "eip155:11155111",
    rpcUrl: "",
    contractAddress: "",
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

  const canIssue = useMemo(() => {
    return (
      form.credentialId &&
      form.subjectDid &&
      form.validFrom &&
      form.chainId &&
      form.contractAddress &&
      form.components.length > 0
    );
  }, [form]);

  async function onIssue() {
    setError(null);
    setVc(null);
    setBusy(true);
    try {
      const hashedComponents = hashComponents({
        credentialId: form.credentialId,
        components: form.components,
        hashAlg: HASH_ALG,
        leafEncoding: LEAF_ENCODING,
      });

      const { merkleRoot, proofs } = buildMerkle({
        leaves: hashedComponents.map((c) => ({ name: c.name, hash: c.componentHash })),
      });

      const anchored = await anchorRoot({
        chainId: form.chainId,
        rpcUrl: form.rpcUrl,
        contractAddress: form.contractAddress,
        merkleRoot,
      });

      const unsigned = assembleVc({
        credentialId: form.credentialId,
        validFrom: form.validFrom,
        subjectDid: form.subjectDid,
        degree: form.degree,
        components: hashedComponents,
        merkle: {
          chainId: anchored.chainId,
          contractAddress: anchored.contractAddress,
          merkleRoot,
          anchorTx: anchored.anchorTx,
          proofs,
        },
      });

      const signed = await signVc(unsigned);

      setVc(signed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>IU VC Issuer (Phase 2)</h1>
        <p>
          Issues a W3C VC v2 JSON-LD with <code>iu:merkleReceipt</code> and a{" "}
          <code>DataIntegrityProof</code> (<code>eddsa-rdfc-2022</code>).
        </p>
      </header>

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
          <label>
            contractAddress
            <input
              value={form.contractAddress}
              onChange={(e) => setForm((s) => ({ ...s, contractAddress: e.target.value }))}
              placeholder="0x..."
            />
          </label>
          <p className="hint">
            UI anchoring expects an injected EIP-1193 provider (MetaMask) unless you wire a private
            key based flow.
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
            {busy ? "Issuing..." : "Issue VC"}
          </button>
          {vc && (
            <button type="button" onClick={() => downloadJson("vc.json", vc)}>
              Download vc.json
            </button>
          )}
        </div>
        {error && <pre className="error">{error}</pre>}
      </section>

      {vc && (
        <section className="card">
          <h2>Output</h2>
          <pre className="code">{JSON.stringify(vc, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
