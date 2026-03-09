import test from "node:test";
import assert from "node:assert/strict";
import * as jose from "jose";
import { initKeys } from "./keys.js";
import { buildJwtVc } from "./oid4vci.service.js";

const TEST_ISSUER_DID
  = "did:web:infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle";
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

test("buildJwtVc signs with ES256 and registry verification method kid", async () => {
  const original = { ...process.env };
  process.env.ISSUER_DID = TEST_ISSUER_DID;
  process.env.OID4VCI_PRIVATE_JWK = TEST_ES256_JWK;
  delete process.env.ISSUER_ED25519_PRIVATE_KEY;

  try {
    await initKeys();

    const jwt = await buildJwtVc({
      createdAt: Date.now(),
      credentialConfigId: "IU_Degree_JWTVC",
      expiresAt: Date.now() + 60_000,
      subjectId: "did:example:student123",
    } as any);

    const header = jose.decodeProtectedHeader(jwt);
    assert.equal(header.alg, "ES256");
    assert.equal(header.kid, TEST_KID);
  } finally {
    process.env = original;
  }
});
