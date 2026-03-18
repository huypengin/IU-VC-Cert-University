/**
 * OID4VCI Controller – Express request handlers for all endpoints.
 */

import type { Request, Response } from "express";
import {
  createCredentialOffer,
  createPickupOfferResponse,
  createPickupOfferResponseFromVc,
  exchangeCodeForToken,
  generateNonceResponse,
  validateAccessToken,
  buildJwtVc,
  OID4VCIError,
} from "./oid4vci.service.js";
import { getPublicJWKS, getSigningAlg } from "./keys.js";

function buildIssuerMetadataBase() {
  const port = Number(process.env.OID4VCI_PORT) || 8787;
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;

  const vcTypes = [
    "VerifiableCredential",
    "UniversityDegree",
    "EducationalOccupationalCredential",
    "VNEduDegreeCredential",
    "IUSmartCertCredential",
  ];

  return {
    baseUrl,
    vcTypes,
    signingAlg: getSigningAlg(),
    baseMetadata: {
      credential_issuer: baseUrl,
      credential_endpoint: `${baseUrl}/oid4vci/credential`,
      token_endpoint: `${baseUrl}/oid4vci/token`,
      nonce_endpoint: `${baseUrl}/oid4vci/nonce`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    },
  };
}

function buildIssuerMetadataDraft13() {
  const { vcTypes, signingAlg, baseMetadata } = buildIssuerMetadataBase();

  return {
    ...baseMetadata,
    credential_configurations_supported: {
      IU_Degree_JWTVC: {
        format: "jwt_vc_json",
        scope: "IU_Degree_JWTVC",
        credential_definition: {
          type: vcTypes,
        },
        types: vcTypes,
        cryptographic_binding_methods_supported: ["did:web", "did:jwk", "did:key", "did:example"],
        credential_signing_alg_values_supported: [signingAlg],
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
  };
}

function buildIssuerMetadataDraft11() {
  const { vcTypes, baseMetadata } = buildIssuerMetadataBase();

  return {
    ...baseMetadata,
    credentials_supported: [
      {
        format: "jwt_vc_json",
        types: vcTypes,
        credential_definition: {
          type: vcTypes,
        },
      },
    ],
  };
}

// ─── GET /.well-known/openid-credential-issuer ──────────────────────────────

export function getIssuerMetadata(_req: Request, res: Response): void {
  res.json(buildIssuerMetadataDraft13());
}

export function getIssuerMetadataDraft11(_req: Request, res: Response): void {
  res.json(buildIssuerMetadataDraft11());
}

// ─── GET /.well-known/jwks.json ─────────────────────────────────────────────

export function getJwks(_req: Request, res: Response): void {
  res.json(getPublicJWKS());
}

// ─── GET /oid4vci/credential-offer ──────────────────────────────────────────

export function getCredentialOffer(_req: Request, res: Response): void {
  // Accept optional subjectId via query param for flexibility
  const subjectId =
    ((_req.query.subject_id as string) ?? "did:example:student123");
  const preAuthorizedCode =
    (_req.query.pre_authorized_code as string | undefined);
  res.json(createCredentialOffer(subjectId, preAuthorizedCode));
}

export function getPickupOffer(req: Request, res: Response): void {
  const subjectId = ((req.query.subject_id as string) ?? "did:example:student123");
  res.json(createPickupOfferResponse(subjectId));
}

export function postPickupOffer(req: Request, res: Response): void {
  const uploadedVc = req.body?.vc;
  if (!uploadedVc || typeof uploadedVc !== "object" || Array.isArray(uploadedVc)) {
    res.status(400).json({
      error: "invalid_request",
      error_description: "Request body must include a vc object",
    });
    return;
  }

  const bodySubjectId = req.body?.subject_id as string | undefined;
  const vcSubjectId = (uploadedVc as { credentialSubject?: { id?: string } }).credentialSubject?.id;

  if (bodySubjectId && vcSubjectId && bodySubjectId !== vcSubjectId) {
    res.status(400).json({
      error: "invalid_request",
      error_description:
        "subject_id in request body does not match vc.credentialSubject.id",
    });
    return;
  }

  const subjectId = bodySubjectId ?? vcSubjectId ?? "did:example:student123";
  res.json(
    createPickupOfferResponseFromVc({
      subjectId,
      vc: uploadedVc as Record<string, unknown>,
    }),
  );
}

// ─── POST /oid4vci/nonce ────────────────────────────────────────────────────

export function getNonce(_req: Request, res: Response): void {
  res.json(generateNonceResponse());
}

export function postNonce(_req: Request, res: Response): void {
  res.json(generateNonceResponse());
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
      format: "jwt_vc_json",
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
