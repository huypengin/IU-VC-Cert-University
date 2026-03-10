import test from "node:test";
import assert from "node:assert/strict";

import { finalizeAdvancedVerification } from "./index.js";
import { checkRevocationStatus } from "./chainVerification.js";

const REVOCATION_KEY = `0x${"11".repeat(32)}`;

test("checkRevocationStatus returns an invalid chain result when the contract marks the VC revoked", async () => {
  const result = await checkRevocationStatus(
    {
      isValid: async () => [false, "issuer revoked"],
    },
    {
      componentsProofs: [
        { name: "diploma", mandatory: true, hash: REVOCATION_KEY, proof: [] },
      ],
    } as any,
    {
      chainId: "eip155:11155111",
      contractAddress: "0x123",
    },
  );

  assert.equal(result.valid, false);
  assert.equal(result.revoked, true);
  assert.equal(result.revocationReason, "issuer revoked");
  assert.equal(result.revocationKey, REVOCATION_KEY);
  assert.match(result.error ?? "", /revoked/i);
});

test("finalizeAdvancedVerification marks the VC invalid when the chain result is revoked", () => {
  const result = finalizeAdvancedVerification(
    {
      valid: true,
      signatureValid: true,
      issuerValid: true,
      temporalValid: true,
    },
    {
      valid: true,
      componentsVerified: 1,
      totalComponents: 1,
      computedRoot: "0xabc",
      receiptRoot: "0xabc",
    },
    {
      valid: false,
      anchorTxConfirmed: true,
      chainId: "eip155:11155111",
      contractAddress: "0x123",
      revoked: true,
      revocationReason: "issuer revoked",
      revocationKey: REVOCATION_KEY,
      error: "Credential revoked on-chain: issuer revoked",
    },
    "evidence",
  );

  assert.equal(result.valid, false);
  assert.equal(result.phase, "advanced");
  assert.equal(result.chain?.revoked, true);
  assert.equal(result.chain?.revocationReason, "issuer revoked");
});
