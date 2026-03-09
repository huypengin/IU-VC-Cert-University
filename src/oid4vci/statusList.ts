import { gzipSync } from "node:zlib";
import { createStatusListStore, getStatusListCredentialUrl } from "./statusListStore.js";
import { normalizeRegistryUrl } from "../vc/registryUrl.js";

export type StatusListCredential = {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string;
  validFrom: string;
  credentialSubject: {
    id: string;
    type: "StatusList2021";
    statusPurpose: string;
    encodedList: string;
  };
};

type BuildStatusListCredentialInput = {
  baseUrl: string;
  listPath: string;
  issuerDid: string;
  revokedIndexes: number[];
};

function encodeBitstring(revokedIndexes: number[]): string {
  const maxIndex = revokedIndexes.length > 0 ? Math.max(...revokedIndexes) : 0;
  const bytes = Buffer.alloc(Math.floor(maxIndex / 8) + 1);

  for (const index of revokedIndexes) {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    bytes[byteIndex] |= 1 << bitIndex;
  }

  return gzipSync(bytes).toString("base64url");
}

export function buildStatusListCredential(
  input: BuildStatusListCredentialInput,
): StatusListCredential {
  const id = getStatusListCredentialUrl(input.baseUrl, input.listPath);

  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://w3id.org/vc/status-list/2021/v1",
      "https://w3id.org/security/data-integrity/v2",
    ],
    id,
    type: ["VerifiableCredential", "StatusList2021Credential"],
    issuer: input.issuerDid,
    validFrom: new Date().toISOString(),
    credentialSubject: {
      id: `${id}#list`,
      type: "StatusList2021",
      statusPurpose: "revocation",
      encodedList: encodeBitstring(input.revokedIndexes),
    },
  };
}

function getRegistryBaseUrl(port: number): string {
  const candidate =
    process.env.SCHEMA_URL?.trim()
    || process.env.DEGREE_CONTEXT_URL?.trim()
    || process.env.BASE_URL?.trim()
    || `http://localhost:${port}`;
  return new URL(normalizeRegistryUrl(candidate)).origin;
}

export function getConfiguredStatusListCredential(): StatusListCredential {
  const port = Number(process.env.OID4VCI_PORT) || 8787;
  const baseUrl = getRegistryBaseUrl(port);
  const issuerDid = process.env.ISSUER_DID ?? baseUrl;
  const listPath = process.env.STATUS_LIST_PATH ?? "/status/degree/2026/status-list.json";
  const revokedIndexes = (process.env.STATUS_LIST_REVOKED_INDEXES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value >= 0);
  const revokedCredentialIds = (process.env.STATUS_LIST_REVOKED_CREDENTIAL_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const store = createStatusListStore({ baseUrl, listPath });
  for (const credentialId of revokedCredentialIds) {
    store.revoke(credentialId);
  }
  const combinedRevokedIndexes = [...new Set([
    ...revokedIndexes,
    ...store.getRevokedIndexes(),
  ])].sort((left, right) => left - right);

  return buildStatusListCredential({
    baseUrl,
    listPath,
    issuerDid,
    revokedIndexes: combinedRevokedIndexes,
  });
}
