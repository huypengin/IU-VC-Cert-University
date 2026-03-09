import { gzipSync } from "node:zlib";

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
  revokedIndexes: number[];
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizeListPath(listPath: string): string {
  return listPath.startsWith("/") ? listPath : `/${listPath}`;
}

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
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const listPath = normalizeListPath(input.listPath);
  const id = `${baseUrl}${listPath}`;

  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
    ],
    id,
    type: ["VerifiableCredential", "StatusList2021Credential"],
    issuer: baseUrl,
    validFrom: new Date().toISOString(),
    credentialSubject: {
      id: `${id}#list`,
      type: "StatusList2021",
      statusPurpose: "revocation",
      encodedList: encodeBitstring(input.revokedIndexes),
    },
  };
}

export function getConfiguredStatusListCredential(): StatusListCredential {
  const port = Number(process.env.OID4VCI_PORT) || 8787;
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;
  const listPath = process.env.STATUS_LIST_PATH ?? "/status/degree/2026";
  const revokedIndexes = (process.env.STATUS_LIST_REVOKED_INDEXES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value >= 0);

  return buildStatusListCredential({
    baseUrl,
    listPath,
    revokedIndexes,
  });
}
