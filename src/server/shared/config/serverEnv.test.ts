import test from "node:test";
import assert from "node:assert/strict";

import {
  readOid4VCIServerEnv,
  readVerifierPolicyServerEnv,
} from "./serverEnv.js";

test("readVerifierPolicyServerEnv parses defaults and trusted issuers", () => {
  const env = readVerifierPolicyServerEnv({
    VERIFIER_POLICY_TRUSTED_ISSUERS:
      "did:web:issuer-a.example, did:web:issuer-b.example ",
  });

  assert.equal(env.port, 8788);
  assert.equal(env.baseUrl, "http://localhost:8788");
  assert.deepEqual(env.trustedIssuers, [
    "did:web:issuer-a.example",
    "did:web:issuer-b.example",
  ]);
});

test("readVerifierPolicyServerEnv accepts missing bearer token", () => {
  const env = readVerifierPolicyServerEnv({});

  assert.equal(env.port, 8788);
  assert.equal(env.baseUrl, "http://localhost:8788");
  assert.deepEqual(env.trustedIssuers, []);
});

test("readVerifierPolicyServerEnv includes the active issuer without duplicating it", () => {
  const env = readVerifierPolicyServerEnv({
    ISSUER_DID: "did:web:issuer.iu.example",
    VERIFIER_POLICY_TRUSTED_ISSUERS:
      "did:web:issuer-a.example",
  });

  assert.deepEqual(env.trustedIssuers, [
    "did:web:issuer-a.example",
    "did:web:issuer.iu.example",
  ]);
});

test("readVerifierPolicyServerEnv does not duplicate the active issuer when already trusted", () => {
  const env = readVerifierPolicyServerEnv({
    ISSUER_DID: "did:web:issuer.iu.example",
    VERIFIER_POLICY_TRUSTED_ISSUERS:
      "did:web:issuer-a.example, did:web:issuer.iu.example",
  });

  assert.deepEqual(env.trustedIssuers, [
    "did:web:issuer-a.example",
    "did:web:issuer.iu.example",
  ]);
});

test("readOid4VCIServerEnv preserves the existing OID4VCI defaults", () => {
  const env = readOid4VCIServerEnv({});

  assert.equal(env.port, 8787);
  assert.equal(env.baseUrl, "http://localhost:8787");
});

test("readOid4VCIServerEnv uses explicit BASE_URL when DEV is set", () => {
  const env = readOid4VCIServerEnv({
    BASE_URL: "https://demo.ngrok-free.dev",
    DEV: "true",
    OID4VCI_PORT: "8787",
  });

  assert.equal(env.port, 8787);
  assert.equal(env.baseUrl, "https://demo.ngrok-free.dev");
});
