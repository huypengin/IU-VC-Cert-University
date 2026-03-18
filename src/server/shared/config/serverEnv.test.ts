import test from "node:test";
import assert from "node:assert/strict";

import {
  readOid4VCIServerEnv,
  readVerifierPolicyServerEnv,
} from "./serverEnv.js";

test("readVerifierPolicyServerEnv parses defaults and trusted issuers", () => {
  const env = readVerifierPolicyServerEnv({
    VERIFIER_POLICY_BEARER_TOKEN: "secret",
    VERIFIER_POLICY_TRUSTED_ISSUERS:
      "did:web:issuer-a.example, did:web:issuer-b.example ",
  });

  assert.equal(env.port, 8788);
  assert.equal(env.baseUrl, "http://localhost:8788");
  assert.equal(env.bearerToken, "secret");
  assert.deepEqual(env.trustedIssuers, [
    "did:web:issuer-a.example",
    "did:web:issuer-b.example",
  ]);
});

test("readVerifierPolicyServerEnv rejects missing bearer token", () => {
  assert.throws(() => readVerifierPolicyServerEnv({}), /VERIFIER_POLICY_BEARER_TOKEN/);
});

test("readOid4VCIServerEnv preserves the existing OID4VCI defaults", () => {
  const env = readOid4VCIServerEnv({});

  assert.equal(env.port, 8787);
  assert.equal(env.baseUrl, "http://localhost:8787");
});
