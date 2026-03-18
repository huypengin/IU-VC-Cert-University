import test from "node:test";
import assert from "node:assert/strict";
import * as jose from "jose";
import { initKeys } from "../server/modules/oid4vci/keys.js";
import { postPickupOffer } from "../server/modules/oid4vci/oid4vci.controller.js";
import {
  buildJwtVc,
  createPreAuthCode,
  createPickupOfferResponseFromVc,
  exchangeCodeForToken,
  getUploadedVcForAccessToken,
  validateAccessToken,
} from "../server/modules/oid4vci/oid4vci.service.js";

test("createPickupOfferResponseFromVc stores the uploaded VC against the pre-authorized code", () => {
  const res = createPickupOfferResponseFromVc({
    subjectId: "did:example:student123",
    vc: {
      id: "urn:uuid:test-vc",
      credentialSubject: { id: "did:example:student123" },
      type: [
        "VerifiableCredential",
        "UniversityDegree",
        "EducationalOccupationalCredential",
        "VNEduDegreeCredential",
        "IUSmartCertCredential",
      ],
    },
  });

  const code =
    (
      res.offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"] as {
        "pre-authorized_code": string;
      }
    )["pre-authorized_code"];

  const token = exchangeCodeForToken(code);
  const snapshot = getUploadedVcForAccessToken(token.access_token);

  assert.equal(snapshot.id, "urn:uuid:test-vc");
});

test("exchangeCodeForToken fails later when no uploaded VC is linked to the token", () => {
  const code = createPreAuthCode("did:example:student123");
  const token = exchangeCodeForToken(code);

  assert.throws(() => getUploadedVcForAccessToken(token.access_token), /uploaded vc/i);
});

test("buildJwtVc uses the uploaded VC linked to the access token instead of process.cwd()/vc.json", async () => {
  const res = createPickupOfferResponseFromVc({
    subjectId: "did:example:student123",
    vc: {
      id: "urn:uuid:uploaded-vc",
      type: [
        "VerifiableCredential",
        "UniversityDegree",
        "EducationalOccupationalCredential",
        "VNEduDegreeCredential",
        "IUSmartCertCredential",
      ],
      credentialSubject: { id: "did:example:student123", degree: { name: "BSc" } },
    },
  });

  const code =
    (
      res.offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"] as {
        "pre-authorized_code": string;
      }
    )["pre-authorized_code"];
  const token = exchangeCodeForToken(code);
  await initKeys();
  const jwt = await buildJwtVc(validateAccessToken(token.access_token));
  const payload = jose.decodeJwt(jwt);

  assert.equal((payload.vc as any).credentialSubject.id, "did:example:student123");
  assert.equal(payload.jti, "urn:uuid:uploaded-vc");
});

test("postPickupOffer returns an offer for an uploaded VC payload", () => {
  const req = {
    body: {
      subject_id: "did:example:student123",
      vc: {
        id: "urn:uuid:test-vc",
        credentialSubject: { id: "did:example:student123" },
      },
    },
  } as any;

  let statusCode = 200;
  let jsonBody: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      jsonBody = body;
      return this;
    },
  } as any;

  postPickupOffer(req, res);

  assert.equal(statusCode, 200);
  assert.match((jsonBody as any).offerUri, /^openid-credential-offer:\/\//);
});

test("postPickupOffer returns 400 for a malformed upload body", () => {
  const req = { body: { subject_id: "did:example:student123" } } as any;

  let statusCode = 200;
  let jsonBody: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      jsonBody = body;
      return this;
    },
  } as any;

  postPickupOffer(req, res);

  assert.equal(statusCode, 400);
  assert.equal((jsonBody as any).error, "invalid_request");
});
