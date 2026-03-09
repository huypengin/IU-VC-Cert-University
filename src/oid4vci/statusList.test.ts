import test from "node:test";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { buildStatusListCredential } from "./statusList.js";
import { getStatusListCredential } from "./oid4vci.controller.js";

function isRevoked(encodedList: string, index: number): boolean {
  const decoded = Buffer.from(encodedList, "base64url");
  const bitstring = gunzipSync(decoded);
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  return (bitstring[byteIndex] & (1 << bitIndex)) !== 0;
}

test("buildStatusListCredential returns a StatusList2021Credential with revoked indexes encoded", () => {
  const doc = buildStatusListCredential({
    baseUrl: "https://registry.example",
    listPath: "/status/degree/2026/status-list.json",
    issuerDid: "did:web:registry.example:issuers:principle",
    revokedIndexes: [2, 9],
  });

  assert.deepEqual(doc["@context"], [
    "https://www.w3.org/ns/credentials/v2",
    "https://w3id.org/vc/status-list/2021/v1",
    "https://w3id.org/security/data-integrity/v2",
  ]);
  assert.ok(doc.type.includes("StatusList2021Credential"));
  assert.equal(doc.id, "https://registry.example/status/degree/2026/status-list.json");
  assert.equal(doc.issuer, "did:web:registry.example:issuers:principle");
  assert.equal(
    doc.credentialSubject.id,
    "https://registry.example/status/degree/2026/status-list.json#list",
  );
  assert.equal(doc.credentialSubject.type, "StatusList2021");
  assert.equal(doc.credentialSubject.statusPurpose, "revocation");
  assert.equal(isRevoked(doc.credentialSubject.encodedList, 2), true);
  assert.equal(isRevoked(doc.credentialSubject.encodedList, 9), true);
  assert.equal(isRevoked(doc.credentialSubject.encodedList, 1), false);
});

test("getStatusListCredential serves the configured list document", () => {
  const original = { ...process.env };
  process.env.BASE_URL = "https://issuer.example";
  process.env.SCHEMA_URL = "https://registry.example/credentialSchema/iu-smartcert-v1.schema.json";
  process.env.ISSUER_DID = "did:web:registry.example:issuers:principle";
  process.env.STATUS_LIST_PATH = "/status/degree/2026/status-list.json";
  process.env.STATUS_LIST_REVOKED_INDEXES = "2,9";

  let payload: unknown;
  let cacheControl: string | undefined;
  const res = {
    setHeader(name: string, value: string) {
      if (name === "Cache-Control") cacheControl = value;
      return this;
    },
    json(data: unknown) {
      payload = data;
      return this;
    },
  } as any;

  try {
    getStatusListCredential({} as any, res);
    const doc = payload as ReturnType<typeof buildStatusListCredential>;
    assert.ok(doc.type.includes("StatusList2021Credential"));
    assert.equal(doc.id, "https://registry.example/status/degree/2026/status-list.json");
    assert.equal(cacheControl, "public, max-age=300, must-revalidate");
    assert.equal(isRevoked(doc.credentialSubject.encodedList, 2), true);
  } finally {
    process.env = original;
  }
});
