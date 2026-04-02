import test from "node:test";
import assert from "node:assert/strict";

import { evaluateVerifierPolicy } from "./verifierPolicy.service.js";
import type { EvaluateVerifierPolicyOptions } from "./verifierPolicy.types.js";

const HASH_32 = `0x${"11".repeat(32)}`;

const sampleReceipt = {
  type: ["IUSmartCertMerkleReceipt"],
  chainId: "eip155:11155111",
  contractAddress: "0x123",
  merkleRoot: HASH_32,
  anchorTx: "0xabc",
  leafEncoding: "credentialID||componentType||content",
  merkleTreeSpec: {
    leafHashAlg: "sha256",
    nodeHashAlg: "keccak256",
    sortPairs: true,
    sortLeaves: true,
  },
  componentsProofs: [
    {
      name: "diploma",
      mandatory: true,
      hash: HASH_32,
      proof: [],
    },
  ],
} as const;

const sampleVc = {
  issuer: "did:web:issuer.iu.example",
  credentialSubject: {
    id: "did:example:student123",
  },
  evidence: [sampleReceipt],
};

const wrappedJwtVcPayload = {
  iss: "did:web:issuer.iu.example",
  sub: "did:example:student123",
  jti: "urn:uuid:test-vc",
  vc: {
    type: ["VerifiableCredential", "IUSmartCertCredential"],
    credentialSubject: {
      id: "did:example:student123",
    },
    evidence: [sampleReceipt],
    iu_merkle_receipt: sampleReceipt,
  },
};

function createDeps(
  overrides: Partial<NonNullable<EvaluateVerifierPolicyOptions["deps"]>> = {},
) {
  return {
    resolveReceipt: async () => ({
      receipt: sampleReceipt as any,
      source: "evidence" as const,
    }),
    verifyMerkleProofs: async () => ({
      valid: true,
      componentsVerified: 1,
      totalComponents: 1,
      computedRoot: HASH_32,
      receiptRoot: HASH_32,
    }),
    verifyChainAnchoring: async () => ({
      valid: true,
      anchorTxConfirmed: true,
      chainId: "eip155:11155111",
      contractAddress: "0x123",
      revoked: false,
      revocationReason: "",
      revocationKey: HASH_32,
    }),
    ...overrides,
  };
}

test("evaluateVerifierPolicy returns accept when all enabled checks pass", async () => {
  const result = await evaluateVerifierPolicy(sampleVc, {
    trustedIssuers: ["did:web:issuer.iu.example"],
    deps: createDeps(),
  });

  assert.equal(result.httpStatus, 200);
  assert.deepEqual(result.body, {
    decision: "accept",
    checks: {
      merkle: "passed",
      chain: "passed",
      revocation: "active",
      issuerTrust: "trusted",
    },
  });
  assert.equal(result.logCategory, "accept");
});

test("evaluateVerifierPolicy accepts wrapped JWT VC payloads from the old walt.id webhook flow", async () => {
  let resolvedVc: Record<string, unknown> | undefined;

  const result = await evaluateVerifierPolicy(wrappedJwtVcPayload, {
    trustedIssuers: ["did:web:issuer.iu.example"],
    deps: createDeps({
      resolveReceipt: async (vc) => {
        resolvedVc = vc;
        return {
          receipt: sampleReceipt as any,
          source: "legacy" as const,
        };
      },
    }),
  });

  assert.equal(result.httpStatus, 200);
  assert.equal(resolvedVc?.issuer, "did:web:issuer.iu.example");
  assert.equal(resolvedVc?.id, "urn:uuid:test-vc");
  assert.deepEqual(resolvedVc?.credentialSubject, {
    id: "did:example:student123",
  });
  assert.deepEqual(resolvedVc?.["iu:merkleReceipt"], sampleReceipt);
});

test("evaluateVerifierPolicy returns 409 when the issuer is not trusted", async () => {
  const result = await evaluateVerifierPolicy(sampleVc, {
    trustedIssuers: ["did:web:other.iu.example"],
    deps: createDeps(),
  });

  assert.equal(result.httpStatus, 409);
  assert.deepEqual(result.body, {
    decision: "reject",
    reason: "Issuer is not trusted by IU policy",
    checks: {
      merkle: "skipped",
      chain: "skipped",
      revocation: "skipped",
      issuerTrust: "untrusted",
    },
  });
  assert.equal(result.logCategory, "policy_reject");
});

test("evaluateVerifierPolicy returns 409 when the credential is revoked", async () => {
  const result = await evaluateVerifierPolicy(sampleVc, {
    trustedIssuers: ["did:web:issuer.iu.example"],
    deps: createDeps({
      verifyChainAnchoring: async () => ({
        valid: false,
        anchorTxConfirmed: true,
        chainId: "eip155:11155111",
        contractAddress: "0x123",
        revoked: true,
        revocationReason: "issuer revoked",
        revocationKey: HASH_32,
        error: "Credential revoked on-chain: issuer revoked",
      }),
    }),
  });

  assert.equal(result.httpStatus, 409);
  assert.deepEqual(result.body, {
    decision: "reject",
    reason: "issuer revoked",
    checks: {
      merkle: "passed",
      chain: "passed",
      revocation: "revoked",
      issuerTrust: "trusted",
    },
  });
  assert.equal(result.logCategory, "policy_reject");
});

test("evaluateVerifierPolicy returns 422 for non-object input", async () => {
  const result = await evaluateVerifierPolicy("not-a-vc", {
    trustedIssuers: ["did:web:issuer.iu.example"],
    deps: createDeps(),
  });

  assert.equal(result.httpStatus, 422);
  assert.deepEqual(result.body, {
    decision: "reject",
    reason: "Request body must be a VC JSON object",
    checks: {
      merkle: "skipped",
      chain: "skipped",
      revocation: "skipped",
      issuerTrust: "skipped",
    },
  });
  assert.equal(result.logCategory, "input_error");
});

test("evaluateVerifierPolicy returns 422 for object payloads without any issuer claim", async () => {
  const result = await evaluateVerifierPolicy(
    {
      vc: {
        credentialSubject: {
          id: "did:example:student123",
        },
      },
    },
    {
      trustedIssuers: ["did:web:issuer.iu.example"],
      deps: createDeps(),
    },
  );

  assert.equal(result.httpStatus, 422);
  assert.deepEqual(result.body, {
    decision: "reject",
    reason: "VC issuer is missing or invalid",
    checks: {
      merkle: "skipped",
      chain: "skipped",
      revocation: "skipped",
      issuerTrust: "skipped",
    },
  });
});

test("evaluateVerifierPolicy returns 503 for dependency failures", async () => {
  const result = await evaluateVerifierPolicy(sampleVc, {
    trustedIssuers: ["did:web:issuer.iu.example"],
    deps: createDeps({
      verifyChainAnchoring: async () => {
        throw new Error("RPC unavailable");
      },
    }),
  });

  assert.equal(result.httpStatus, 503);
  assert.deepEqual(result.body, {
    decision: "reject",
    reason: "RPC unavailable",
    checks: {
      merkle: "passed",
      chain: "indeterminate",
      revocation: "indeterminate",
      issuerTrust: "trusted",
    },
  });
  assert.equal(result.logCategory, "dependency_failure");
});
