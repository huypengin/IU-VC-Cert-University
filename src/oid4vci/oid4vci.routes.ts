/**
 * OID4VCI Routes – Express router wiring.
 */

import { Router } from "express";
import {
  getIssuerMetadata,
  getIssuerMetadataDraft11,
  getJwks,
  getCredentialOffer,
  getPickupOffer,
  postPickupOffer,
  getNonce,
  postNonce,
  postToken,
  postCredential,
} from "./oid4vci.controller.js";

const router = Router();

// Well-known endpoints
router.get("/.well-known/openid-credential-issuer", getIssuerMetadata);
router.get("/.well-known/openid-credential-issuer-draft11", getIssuerMetadataDraft11);
router.get("/.well-known/jwks.json", getJwks);

// OID4VCI flow endpoints
router.get("/oid4vci/credential-offer", getCredentialOffer);
router.get("/oid4vci/pickup-offer", getPickupOffer);
router.post("/oid4vci/pickup-offer", postPickupOffer);
router.get("/oid4vci/nonce", getNonce);
router.post("/oid4vci/nonce", postNonce);
router.post("/oid4vci/token", postToken);
router.post("/oid4vci/credential", postCredential);

export default router;
