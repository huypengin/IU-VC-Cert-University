import test from "node:test";
import assert from "node:assert/strict";
import { mapPickupOfferResponse } from "./pickupApi.js";

test("mapPickupOfferResponse validates required fields", () => {
  const mapped = mapPickupOfferResponse({
    offerUri: "openid-credential-offer://?credential_offer=x",
    expiresInSec: 300,
  });
  assert.equal(mapped.offerUri.startsWith("openid-credential-offer://"), true);
  assert.equal(mapped.expiresInSec, 300);
});
