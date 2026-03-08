import test from "node:test";
import assert from "node:assert/strict";
import { getKid, getPublicJWKS, getSigningAlg, initKeys } from "./keys.js";

const TEST_ISSUER_DID =
  "did:web:infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle";
const TEST_KID = `${TEST_ISSUER_DID}#key-1`;
const TEST_ES256_JWK = JSON.stringify({
  kty: "EC",
  crv: "P-256",
  x: "CaFALmxkwFCeoOe4QflLaSYvsg8_WN5f5JAbXfQJ_wg",
  y: "iCpsroZS0_Ipqi2QBZWqCRSZz8XV2vvzL-sLriDM3Rk",
  d: "BdYUaJ2ss6_pqIzsUi7k7xrkDucwPsuK3ksxNO6g0Ko",
  use: "sig",
  alg: "ES256",
  kid: TEST_KID,
});

test("initKeys uses ES256 JWK and preserves registry verification method kid", async () => {
  const original = { ...process.env };
  process.env.ISSUER_DID = TEST_ISSUER_DID;
  process.env.OID4VCI_PRIVATE_JWK = TEST_ES256_JWK;
  delete process.env.ISSUER_ED25519_PRIVATE_KEY;

  try {
    await initKeys();

    const jwks = getPublicJWKS();
    const key = jwks.keys[0] as Record<string, string>;

    assert.equal(getSigningAlg(), "ES256");
    assert.equal(getKid(), TEST_KID);
    assert.equal(key.kty, "EC");
    assert.equal(key.crv, "P-256");
    assert.equal(key.alg, "ES256");
    assert.equal(key.kid, TEST_KID);
  } finally {
    process.env = original;
  }
});

test("initKeys rejects Ed25519 fallback for did:web issuer when registry JWK is missing", async () => {
  const original = { ...process.env };
  process.env.ISSUER_DID = TEST_ISSUER_DID;
  process.env.ISSUER_ED25519_PRIVATE_KEY = "aV/86EiElU+H9aW46ccq5vtCJv5A7+TlIz5ZWTsjwFQ=";
  delete process.env.OID4VCI_PRIVATE_JWK;

  try {
    await assert.rejects(
      initKeys(),
      /OID4VCI_PRIVATE_JWK.*ES256.*did\.json/i,
    );
  } finally {
    process.env = original;
  }
});
