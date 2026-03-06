import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCredentialOfferUri,
  buildCredentialOfferUriByReference,
} from "./offerUri.js";

test("buildCredentialOfferUri encodes credential_offer JSON", () => {
  const uri = buildCredentialOfferUri({
    credential_issuer: "https://issuer.example",
    credential_configuration_ids: ["IU_Degree_JWTVC"],
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": "abc123",
        user_pin_required: false,
      },
    },
  });

  assert.match(uri, /^openid-credential-offer:\/\/\?credential_offer=/);
  assert.match(uri, /IU_Degree_JWTVC/);
});

test("buildCredentialOfferUriByReference encodes credential_offer_uri URL", () => {
  const uri = buildCredentialOfferUriByReference(
    "https://issuer.example/oid4vci/credential-offer?subject_id=did%3Aexample%3Astudent123",
  );

  assert.match(uri, /^openid-credential-offer:\/\/\?credential_offer_uri=/);
  assert.match(uri, /credential-offer/);
});
