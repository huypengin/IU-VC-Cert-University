import test from "node:test";
import assert from "node:assert/strict";
import { getIssuerMetadata } from "./oid4vci.controller.js";

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
