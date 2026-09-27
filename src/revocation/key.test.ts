import test from "node:test";
import assert from "node:assert/strict";

import { getRevocationKeyFromReceipt } from "./key.js";

test("getRevocationKeyFromReceipt returns the first mandatory component hash", () => {
  const receipt = {
    componentsProofs: [
      { name: "transcript", mandatory: false, hash: "0x02", proof: [] },
      { name: "diploma", mandatory: true, hash: "0x11", proof: [] },
      { name: "thesis", mandatory: true, hash: "0x22", proof: [] },
    ],
  } as any;

  assert.equal(getRevocationKeyFromReceipt(receipt), "0x11");
});

test("getRevocationKeyFromReceipt falls back to first component hash when no mandatory component exists", () => {
  assert.equal(
    getRevocationKeyFromReceipt({
      componentsProofs: [{ name: "transcript", mandatory: false, hash: "0x02", proof: [] }],
    } as any),
    "0x02",
  );
});

test("getRevocationKeyFromReceipt throws when no component hash exists", () => {
  assert.throws(
    () =>
      getRevocationKeyFromReceipt({
        componentsProofs: [],
      } as any),
    /component hash/i,
  );
});
