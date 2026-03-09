import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
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

test("buildJwtVc reads canonical VC from VC_JSON_PATH when provided", async () => {
  const original = { ...process.env };
  process.env.ISSUER_DID = TEST_ISSUER_DID;
  process.env.OID4VCI_PRIVATE_JWK = TEST_ES256_JWK;
  process.env.VC_JSON_PATH = resolve(process.cwd(), "src/oid4vci/__fixtures__/jwt-vc.json");
  delete process.env.ISSUER_ED25519_PRIVATE_KEY;

  try {
    await initKeys();

    const jwt = await buildJwtVc({
      createdAt: Date.now(),
      credentialConfigId: "IU_Degree_JWTVC",
      expiresAt: Date.now() + 60_000,
      subjectId: "did:example:student123",
    } as any);

    const payload = jose.decodeJwt(jwt) as {
      jti: string;
      vc: {
        credentialStatus?: {
          type: string;
          statusListCredential: string;
          statusListIndex: string;
        };
      };
    };
    assert.equal(payload.jti, "urn:uuid:test-statuslist-fixture");
    assert.equal(payload.vc.credentialStatus?.type, "StatusList2021Entry");
    assert.equal(
      payload.vc.credentialStatus?.statusListCredential,
      "https://issuer.example/status/degree/2026",
    );
    assert.equal(payload.vc.credentialStatus?.statusListIndex, "42");
  } finally {
    process.env = original;
  }
});
