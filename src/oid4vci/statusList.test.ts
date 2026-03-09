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
    baseUrl: "https://issuer.example",
    listPath: "/status/degree/2026",
    revokedIndexes: [2, 9],
  });

  assert.ok(doc.type.includes("StatusList2021Credential"));
  assert.equal(doc.id, "https://issuer.example/status/degree/2026");
  assert.equal(doc.credentialSubject.id, "https://issuer.example/status/degree/2026#list");
  assert.equal(doc.credentialSubject.type, "StatusList2021");
  assert.equal(doc.credentialSubject.statusPurpose, "revocation");
  assert.equal(isRevoked(doc.credentialSubject.encodedList, 2), true);
  assert.equal(isRevoked(doc.credentialSubject.encodedList, 9), true);
  assert.equal(isRevoked(doc.credentialSubject.encodedList, 1), false);
});

test("getStatusListCredential serves the configured list document", () => {
  const original = { ...process.env };
  process.env.BASE_URL = "https://issuer.example";
  process.env.STATUS_LIST_PATH = "/status/degree/2026";
  process.env.STATUS_LIST_REVOKED_INDEXES = "2,9";

  let payload: unknown;
  const res = {
    json(data: unknown) {
      payload = data;
      return this;
    },
  } as any;

  try {
    getStatusListCredential({} as any, res);
    const doc = payload as ReturnType<typeof buildStatusListCredential>;
    assert.ok(doc.type.includes("StatusList2021Credential"));
    assert.equal(doc.id, "https://issuer.example/status/degree/2026");
    assert.equal(isRevoked(doc.credentialSubject.encodedList, 2), true);
  } finally {
    process.env = original;
  }
});
