import test from "node:test";
import assert from "node:assert/strict";
import { createPickupOfferResponse } from "./oid4vci.service.js";

test("createPickupOfferResponse returns offer URI and expiry", () => {
  const res = createPickupOfferResponse("did:example:student123");
  assert.ok(res.offer);
  assert.match(res.offerUri, /^openid-credential-offer:\/\//);
  assert.equal(typeof res.expiresInSec, "number");
  assert.equal(res.expiresInSec > 0, true);
});
