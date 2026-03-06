import test from "node:test";
import assert from "node:assert/strict";
import { buildDidDocument, didWebPathFromDid } from "./did.js";

test("didWebPathFromDid maps did:web with path segments", () => {
  assert.equal(
    didWebPathFromDid("did:web:example.com:issuers:principle"),
    "/issuers/principle/did.json",
  );
});

test("didWebPathFromDid maps bare did:web to .well-known", () => {
  assert.equal(
    didWebPathFromDid("did:web:example.com"),
    "/.well-known/did.json",
  );
});

test("buildDidDocument creates JsonWebKey2020 verification method", () => {
  const did = "did:web:example.com:issuers:principle";
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: "x-value",
    y: "y-value",
    use: "sig",
    alg: "ES256",
    kid: "oid4vci-key-1",
  };
  const doc = buildDidDocument(did, jwk, "oid4vci-key-1");
  const vmId = `${did}#oid4vci-key-1`;

  assert.equal(doc.id, did);
  assert.equal(doc.verificationMethod[0].id, vmId);
  assert.equal(doc.verificationMethod[0].type, "JsonWebKey2020");
  assert.equal(doc.authentication[0], vmId);
  assert.equal(doc.assertionMethod[0], vmId);
});
