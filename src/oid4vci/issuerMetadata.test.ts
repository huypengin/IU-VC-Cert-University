import test from "node:test";
import assert from "node:assert/strict";
import { getIssuerMetadata } from "./oid4vci.controller.js";
import { initKeys } from "./keys.js";

const TEST_ISSUER_DID
  = "did:web:infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle";
const TEST_ES256_JWK = JSON.stringify({
  kty: "EC",
  crv: "P-256",
  x: "CaFALmxkwFCeoOe4QflLaSYvsg8_WN5f5JAbXfQJ_wg",
  y: "iCpsroZS0_Ipqi2QBZWqCRSZz8XV2vvzL-sLriDM3Rk",
  d: "BdYUaJ2ss6_pqIzsUi7k7xrkDucwPsuK3ksxNO6g0Ko",
  use: "sig",
  alg: "ES256",
  kid: `${TEST_ISSUER_DID}#key-1`,
});

test("issuer metadata exposes deducible credential types for wallet", () => {
  let payload: unknown;
  const res = {
    json(data: unknown) {
      payload = data;
      return this;
    },
  } as any;

  getIssuerMetadata({} as any, res);

  const metadata = payload as {
    nonce_endpoint: string;
    credential_configurations_supported: Record<string, any>;
  };
  const cfg = metadata.credential_configurations_supported.IU_Degree_JWTVC;

  assert.equal(
    metadata.nonce_endpoint,
    "http://localhost:8787/oid4vci/nonce",
  );
  assert.equal(cfg.format, "jwt_vc_json");
  assert.ok(Array.isArray(cfg.credential_definition?.type));
  assert.ok(cfg.credential_definition.type.includes("VerifiableCredential"));
  assert.ok(cfg.credential_definition.type.includes("IUSmartCertCredential"));
  assert.ok(Array.isArray(cfg.types));
  assert.ok(cfg.types.includes("VerifiableCredential"));
});

test("issuer metadata advertises ES256 when registry ES256 key is configured", async () => {
  const original = { ...process.env };
  process.env.ISSUER_DID = TEST_ISSUER_DID;
  process.env.OID4VCI_PRIVATE_JWK = TEST_ES256_JWK;
  delete process.env.ISSUER_ED25519_PRIVATE_KEY;

  let payload: unknown;
  const res = {
    json(data: unknown) {
      payload = data;
      return this;
    },
  } as any;

  try {
    await initKeys();
    getIssuerMetadata({} as any, res);
    const metadata = payload as {
      credential_configurations_supported: Record<string, any>;
    };
    const cfg = metadata.credential_configurations_supported.IU_Degree_JWTVC;
    assert.deepEqual(cfg.credential_signing_alg_values_supported, ["ES256"]);
  } finally {
    process.env = original;
  }
});
