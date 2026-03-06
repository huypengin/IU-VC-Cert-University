import test from "node:test";
import assert from "node:assert/strict";
import { createPickupOfferResponse } from "./oid4vci.service.js";

test("createPickupOfferResponse returns offer URI and expiry", () => {
  const res = createPickupOfferResponse("did:example:student123");
  assert.ok(res.offer);
  assert.match(res.offerUri, /^openid-credential-offer:\/\/\?credential_offer_uri=/);
  assert.match(res.offerUri, /oid4vci%2Fcredential-offer/);
  assert.equal(typeof res.expiresInSec, "number");
  assert.equal(res.expiresInSec > 0, true);

  const offerCode = (
    res.offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"] as {
      "pre-authorized_code": string;
    }
  )["pre-authorized_code"];

  const wrapperUrl = new URL(res.offerUri);
  const offerUriParam = wrapperUrl.searchParams.get("credential_offer_uri");
  assert.ok(offerUriParam);

  const offerUrl = new URL(offerUriParam!);
  assert.equal(
    offerUrl.searchParams.get("pre_authorized_code"),
    offerCode,
  );
});
