import test from "node:test";
import assert from "node:assert/strict";

import { parsePickupVcJson } from "./pickupVcFile.js";

test("parsePickupVcJson accepts a VC object and derives the detected subject id", () => {
  const parsed = parsePickupVcJson(
    JSON.stringify({
      id: "urn:uuid:test-vc",
      type: ["VerifiableCredential"],
      credentialSubject: { id: "did:example:student123" },
    }),
    "student.vc.json",
  );

  assert.equal(parsed.filename, "student.vc.json");
  assert.equal(parsed.subjectId, "did:example:student123");
  assert.equal(parsed.vc.id, "urn:uuid:test-vc");
});

test("parsePickupVcJson rejects invalid JSON", () => {
  assert.throws(() => parsePickupVcJson("{", "broken.json"), /json/i);
});

test("parsePickupVcJson rejects non-object payloads", () => {
  assert.throws(() => parsePickupVcJson('"hello"', "bad.json"), /vc/i);
});
