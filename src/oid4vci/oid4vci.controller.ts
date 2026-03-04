/**
 * OID4VCI Controller – Express request handlers for all endpoints.
 */

import type { Request, Response } from "express";
import {
  createPreAuthCode,
  createPickupOfferResponse,
  exchangeCodeForToken,
  validateAccessToken,
  buildJwtVc,
  OID4VCIError,
} from "./oid4vci.service.js";
import { getPublicJWKS } from "./keys.js";

// ─── GET /.well-known/openid-credential-issuer ──────────────────────────────

export function getIssuerMetadata(_req: Request, res: Response): void {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:8787";

  res.json({
    credential_issuer: baseUrl,
    credential_endpoint: `${baseUrl}/oid4vci/credential`,
    token_endpoint: `${baseUrl}/oid4vci/token`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    credential_configurations_supported: {
      IU_Degree_JWTVC: {
        format: "jwt_vc",
        scope: "IU_Degree_JWTVC",
        cryptographic_binding_methods_supported: ["did:example"],
        credential_signing_alg_values_supported: ["ES256"],
        display: [
          {
            name: "IU Bachelor Degree",
            locale: "en-US",
            description:
              "A verifiable credential for an IU Bachelor Degree, anchored on-chain via Merkle tree.",
          },
        ],
      },
    },
  });
}

// ─── GET /.well-known/jwks.json ─────────────────────────────────────────────

export function getJwks(_req: Request, res: Response): void {
  res.json(getPublicJWKS());
}

// ─── GET /oid4vci/credential-offer ──────────────────────────────────────────

export function getCredentialOffer(_req: Request, res: Response): void {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:8787";

  // Accept optional subjectId via query param for flexibility
  const subjectId =
    ((_req.query.subject_id as string) ?? "did:example:student123");

  const code = createPreAuthCode(subjectId);

  res.json({
    credential_issuer: baseUrl,
    credential_configuration_ids: ["IU_Degree_JWTVC"],
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": code,
        user_pin_required: false,
      },
    },
  });
}

export function getPickupOffer(req: Request, res: Response): void {
  const subjectId = ((req.query.subject_id as string) ?? "did:example:student123");
  res.json(createPickupOfferResponse(subjectId));
}

// ─── POST /oid4vci/token ────────────────────────────────────────────────────

export function postToken(req: Request, res: Response): void {
  try {
    // Support both application/x-www-form-urlencoded and JSON
    const preAuthorizedCode: string | undefined =
      req.body?.["pre-authorized_code"] ?? req.body?.pre_authorized_code;

    const grantType: string | undefined =
      req.body?.grant_type;

    if (
      grantType &&
      grantType !== "urn:ietf:params:oauth:grant-type:pre-authorized_code"
    ) {
      res.status(400).json({
        error: "unsupported_grant_type",
        error_description: `Unsupported grant_type: ${grantType}`,
      });
      return;
    }

    if (!preAuthorizedCode) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "Missing pre-authorized_code",
      });
      return;
    }

    const tokenResponse = exchangeCodeForToken(preAuthorizedCode);
    res.json(tokenResponse);
  } catch (err) {
    if (err instanceof OID4VCIError) {
      res.status(400).json({
        error: err.errorCode,
        error_description: err.message,
      });
    } else {
      res.status(500).json({
        error: "server_error",
        error_description: String(err),
      });
    }
  }
}

// ─── POST /oid4vci/credential ───────────────────────────────────────────────

export async function postCredential(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // Validate bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "invalid_token",
        error_description: "Missing or malformed Authorization header",
      });
      return;
    }

    const token = authHeader.slice(7);
    const tokenMeta = validateAccessToken(token);

    // Build and sign JWT VC
    const jwtVc = await buildJwtVc(tokenMeta);

    res.json({
      format: "jwt_vc",
      credential: jwtVc,
    });
  } catch (err) {
    if (err instanceof OID4VCIError) {
      res.status(401).json({
        error: err.errorCode,
        error_description: err.message,
      });
    } else {
      console.error("Credential issuance error:", err);
      res.status(500).json({
        error: "server_error",
        error_description: String(err),
      });
    }
  }
}
