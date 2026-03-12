import test from "node:test";
import assert from "node:assert/strict";
import { createPickupOfferFromVc, fetchPickupOffer, mapPickupOfferResponse } from "./pickupApi.js";

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

test("createPickupOfferFromVc posts the uploaded VC and derived subject id", async (t) => {
  let requestedUrl = "";
  let method = "";
  let headers: HeadersInit | undefined;
  let body = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = String(input);
    method = init?.method ?? "";
    headers = init?.headers;
    body = String(init?.body ?? "");
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

  await createPickupOfferFromVc({
    vc: { credentialSubject: { id: "did:example:student123" } },
    subjectId: "did:example:student123",
  });

  assert.equal(requestedUrl, "http://localhost:8787/oid4vci/pickup-offer");
  assert.equal(method, "POST");
  assert.deepEqual(headers, {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  });
  assert.match(body, /"subject_id":"did:example:student123"/);
  assert.match(body, /"credentialSubject":\{"id":"did:example:student123"\}/);
});
