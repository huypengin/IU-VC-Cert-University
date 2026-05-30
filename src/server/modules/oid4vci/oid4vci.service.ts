/**
 * OID4VCI Service – in-memory stores, token management, JWT VC signing.
 */

import { randomUUID } from "node:crypto";
import * as jose from "jose";
import { getPrivateKey, getKid, getSigningAlg } from "./keys.js";
import {
  buildCredentialOfferUriByReference,
  type CredentialOfferPayload,
} from "./offerUri.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UploadedVcSnapshot extends Record<string, unknown> {
  id?: string;
  type?: unknown;
  evidence?: unknown;
  credentialSubject?: Record<string, unknown> & {
    id?: string;
  };
  "iu:merkleReceipt"?: unknown;
}

type WalletDisplayManifest = {
  display: {
    title: string;
    claims: Record<string, string>;
  };
};

interface PreAuthEntry {
  createdAt: number;
  expiresAt: number;
  used: boolean;
  subjectId: string;
  credentialConfigId: string;
  uploadedVc?: UploadedVcSnapshot;
}

interface TokenEntry {
  createdAt: number;
  expiresAt: number;
  credentialConfigId: string;
  subjectId: string;
  uploadedVc?: UploadedVcSnapshot;
}

// ─── In-memory stores ───────────────────────────────────────────────────────

const preAuthCodes = new Map<string, PreAuthEntry>();
const accessTokens = new Map<string, TokenEntry>();
const nonces = new Map<string, { createdAt: number; expiresAt: number }>();

const PRE_AUTH_TTL_SEC = 300; // 5 min
const TOKEN_TTL_SEC = 300; // 5 min
const NONCE_TTL_SEC = 300; // 5 min

// ─── Pre-authorized code ────────────────────────────────────────────────────

export function createPreAuthCode(
  subjectId: string = "did:example:student123",
  credentialConfigId: string = "IU_Degree_JWTVC",
  uploadedVc?: UploadedVcSnapshot,
): string {
  const code = randomUUID();
  const now = Date.now();
  preAuthCodes.set(code, {
    createdAt: now,
    expiresAt: now + PRE_AUTH_TTL_SEC * 1000,
    used: false,
    subjectId,
    credentialConfigId,
    uploadedVc,
  });
  return code;
}

export function createCredentialOffer(
  subjectId: string,
  preAuthorizedCode?: string,
): CredentialOfferPayload {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:8787";
  const code = preAuthorizedCode ?? createPreAuthCode(subjectId);

  return {
    credential_issuer: baseUrl,
    credential_configuration_ids: ["IU_Degree_JWTVC"],
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": code,
        user_pin_required: false,
      },
    },
  };
}

export function createPickupOfferResponse(subjectId: string) {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:8787";
  const code = createPreAuthCode(subjectId);
  const offer = createCredentialOffer(subjectId, code);
  const offerUrl = new URL("/oid4vci/credential-offer", baseUrl);
  offerUrl.searchParams.set("subject_id", subjectId);
  offerUrl.searchParams.set("pre_authorized_code", code);

  return {
    offer,
    offerUri: buildCredentialOfferUriByReference(offerUrl.toString()),
    expiresInSec: PRE_AUTH_TTL_SEC,
  };
}

export function createPickupOfferResponseFromVc(input: {
  subjectId: string;
  vc: UploadedVcSnapshot;
}) {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:8787";
  const code = createPreAuthCode(input.subjectId, "IU_Degree_JWTVC", input.vc);
  const offer = createCredentialOffer(input.subjectId, code);
  const offerUrl = new URL("/oid4vci/credential-offer", baseUrl);
  offerUrl.searchParams.set("subject_id", input.subjectId);
  offerUrl.searchParams.set("pre_authorized_code", code);

  return {
    offer,
    offerUri: buildCredentialOfferUriByReference(offerUrl.toString()),
    expiresInSec: PRE_AUTH_TTL_SEC,
  };
}

// ─── Token exchange ─────────────────────────────────────────────────────────

// ─── Nonce management ───────────────────────────────────────────────────────

export function createNonce(): string {
  const nonce = randomUUID();
  const now = Date.now();
  nonces.set(nonce, {
    createdAt: now,
    expiresAt: now + NONCE_TTL_SEC * 1000,
  });
  return nonce;
}

export function generateNonceResponse(): {
  c_nonce: string;
  c_nonce_expires_in: number;
} {
  return {
    c_nonce: createNonce(),
    c_nonce_expires_in: NONCE_TTL_SEC,
  };
}

export function createCredentialNonce(): {
  c_nonce: string;
  c_nonce_expires_in: number;
} {
  return generateNonceResponse();
}

export function exchangeCodeForToken(code: string): {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  c_nonce: string;
  c_nonce_expires_in: number;
} {
  const entry = preAuthCodes.get(code);
  if (!entry) throw new OID4VCIError("invalid_grant", "Unknown pre-authorized code");
  if (entry.used) throw new OID4VCIError("invalid_grant", "Pre-authorized code already used");
  if (Date.now() > entry.expiresAt)
    throw new OID4VCIError("invalid_grant", "Pre-authorized code expired");

  // Mark used
  entry.used = true;

  // Issue access token
  const token = randomUUID();
  const now = Date.now();
  accessTokens.set(token, {
    createdAt: now,
    expiresAt: now + TOKEN_TTL_SEC * 1000,
    credentialConfigId: entry.credentialConfigId,
    subjectId: entry.subjectId,
    uploadedVc: entry.uploadedVc,
  });

  // Generate c_nonce for proof-of-possession
  const nonce = createNonce();

  return {
    access_token: token,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SEC,
    c_nonce: nonce,
    c_nonce_expires_in: NONCE_TTL_SEC,
  };
}

// ─── Token validation ───────────────────────────────────────────────────────

export function validateAccessToken(token: string): TokenEntry {
  const entry = accessTokens.get(token);
  if (!entry) throw new OID4VCIError("invalid_token", "Unknown access token");
  if (Date.now() > entry.expiresAt)
    throw new OID4VCIError("invalid_token", "Access token expired");
  return entry;
}

export function getUploadedVcForAccessToken(token: string): UploadedVcSnapshot {
  return getUploadedVcFromTokenMeta(validateAccessToken(token));
}

function getUploadedVcFromTokenMeta(tokenMeta: TokenEntry): UploadedVcSnapshot {
  if (!tokenMeta.uploadedVc) {
    throw new OID4VCIError("invalid_token", "Uploaded VC not found for access token");
  }
  return tokenMeta.uploadedVc;
}

function getRecordField(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return field && typeof field === "object" && !Array.isArray(field)
    ? field as Record<string, unknown>
    : undefined;
}

function getPaperLabel(rawVc: UploadedVcSnapshot): string | undefined {
  const degree = getRecordField(rawVc.credentialSubject, "degree");
  const paperLabel = degree?.["iu:paperLabel"];
  return typeof paperLabel === "string" && paperLabel.trim() ? paperLabel : undefined;
}

function buildWalletCredentialTypes(rawVc: UploadedVcSnapshot): unknown {
  const originalTypes = Array.isArray(rawVc.type) ? rawVc.type : undefined;
  const paperLabel = getPaperLabel(rawVc);
  if (!paperLabel) {
    return rawVc.type ?? ["VerifiableCredential"];
  }

  const baseTypes = originalTypes?.filter((type) => type !== paperLabel) ?? ["VerifiableCredential"];
  return [...baseTypes, paperLabel];
}

function buildWalletDisplayManifest(rawVc: UploadedVcSnapshot): WalletDisplayManifest[] | undefined {
  const title = getPaperLabel(rawVc);
  if (!title) {
    return undefined;
  }

  return [
    {
      display: {
        title,
        claims: {
          "Paper Type": "$.credentialSubject.degree['iu:paperType']",
          "Paper Label": "$.credentialSubject.degree['iu:paperLabel']",
          Degree: "$.credentialSubject.degree.name",
        },
      },
    },
  ];
}

function buildWalletIssuer(issuerDid: string): Record<string, string> {
  return {
    id: issuerDid,
    name: process.env.ISSUER_NAME?.trim() || "International University",
  };
}

// ─── JWT VC builder ─────────────────────────────────────────────────────────

/**
 * Transform the uploaded VC snapshot into a JWT VC payload and sign it with
 * the active OID4VCI key.
 * Returns the compact JWT string.
 */
export async function buildJwtVc(tokenMeta: TokenEntry): Promise<string> {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:8787";
  const issuerDid = process.env.ISSUER_DID ?? baseUrl;
  const rawVc = getUploadedVcFromTokenMeta(tokenMeta);

  const now = Math.floor(Date.now() / 1000);

  // Extract evidence and merkleReceipt as non-critical claims
  const evidence = rawVc.evidence ?? [];
  const merkleReceipt = rawVc["iu:merkleReceipt"] ?? null;
  const display = buildWalletDisplayManifest(rawVc);

  // Build JWT payload
  const payload: Record<string, unknown> = {
    iss: issuerDid,
    sub: tokenMeta.subjectId || rawVc.credentialSubject?.id || "unknown",
    iat: now,
    nbf: now,
    jti: rawVc.id ?? `urn:uuid:${randomUUID()}`,
    vc: {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
      ],
      type: buildWalletCredentialTypes(rawVc),
      issuer: buildWalletIssuer(issuerDid),
      credentialSubject: rawVc.credentialSubject ?? {},
      ...(display ? { display } : {}),
      // Non-critical claims – NOT in "proof"
      evidence,
      ...(merkleReceipt ? { iu_merkle_receipt: merkleReceipt } : {}),
    },
  };

  // Sign with the active OID4VCI JWT key algorithm
  const jwt = await new jose.SignJWT(payload as jose.JWTPayload)
    .setProtectedHeader({ alg: getSigningAlg(), typ: "JWT", kid: getKid() })
    .sign(getPrivateKey());

  return jwt;
}

// ─── Error helper ───────────────────────────────────────────────────────────

export class OID4VCIError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = "OID4VCIError";
  }
}
