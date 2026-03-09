import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCredentialStatusConfig,
  createStatusListStore,
} from "./statusListStore.js";

test("buildCredentialStatusConfig returns a stable StatusList2021 entry for a credential id", () => {
  const first = buildCredentialStatusConfig(
    "https://issuer.example",
    "urn:uuid:test-1",
    "/status/degree/2026",
  );
  const second = buildCredentialStatusConfig(
    "https://issuer.example",
    "urn:uuid:test-1",
    "/status/degree/2026",
  );

  assert.equal(first.statusPurpose, "revocation");
  assert.equal(first.statusListCredential, "https://issuer.example/status/degree/2026");
  assert.equal(first.statusListIndex, second.statusListIndex);
});

test("status list store marks a credential id as revoked using its assigned index", () => {
  const store = createStatusListStore({
    baseUrl: "https://issuer.example",
    listPath: "/status/degree/2026",
  });

  const assigned = store.assign("urn:uuid:test-1");
  store.revoke("urn:uuid:test-1");

  assert.deepEqual(store.getRevokedIndexes(), [assigned.statusListIndex]);
});
