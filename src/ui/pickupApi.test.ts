import test from "node:test";
import assert from "node:assert/strict";
import { fetchPickupOffer, mapPickupOfferResponse } from "./pickupApi.js";

test("mapPickupOfferResponse validates required fields", () => {
  const mapped = mapPickupOfferResponse({
    offerUri: "openid-credential-offer://?credential_offer=x",
    expiresInSec: 300,
  });
  assert.equal(mapped.offerUri.startsWith("openid-credential-offer://"), true);
  assert.equal(mapped.expiresInSec, 300);
});

test("fetchPickupOffer uses issuer API base URL and subject DID query", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        offerUri: "openid-credential-offer://?credential_offer=x",
        expiresInSec: 300,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await fetchPickupOffer("did:example:student123");

  assert.equal(
    requestedUrl,
    "http://localhost:8787/oid4vci/pickup-offer?subject_id=did%3Aexample%3Astudent123",
  );
});
