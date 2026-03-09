export type CredentialStatusConfig = {
  statusPurpose: "revocation";
  statusListCredential: string;
  statusListIndex: number;
};

type StatusListStoreInput = {
  baseUrl: string;
  listPath: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizeListPath(listPath: string): string {
  return listPath.startsWith("/") ? listPath : `/${listPath}`;
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getStatusListCredentialUrl(baseUrl: string, listPath: string): string {
  return `${normalizeBaseUrl(baseUrl)}${normalizeListPath(listPath)}`;
}

export function getStatusListIndexForCredentialId(credentialId: string): number {
  return stableHash(credentialId) % 131072;
}

export function buildCredentialStatusConfig(
  baseUrl: string,
  credentialId: string,
  listPath: string,
): CredentialStatusConfig {
  return {
    statusPurpose: "revocation",
    statusListCredential: getStatusListCredentialUrl(baseUrl, listPath),
    statusListIndex: getStatusListIndexForCredentialId(credentialId),
  };
}

export function createStatusListStore(input: StatusListStoreInput) {
  const records = new Map<string, { statusListIndex: number; revoked: boolean }>();

  function assign(credentialId: string): CredentialStatusConfig {
    const existing = records.get(credentialId);
    if (existing) {
      return buildCredentialStatusConfig(input.baseUrl, credentialId, input.listPath);
    }

    records.set(credentialId, {
      statusListIndex: getStatusListIndexForCredentialId(credentialId),
      revoked: false,
    });
    return buildCredentialStatusConfig(input.baseUrl, credentialId, input.listPath);
  }

  function revoke(credentialId: string): void {
    const assigned = records.get(credentialId) ?? {
      statusListIndex: getStatusListIndexForCredentialId(credentialId),
      revoked: false,
    };
    records.set(credentialId, {
      statusListIndex: assigned.statusListIndex,
      revoked: true,
    });
  }

  function getRevokedIndexes(): number[] {
    return [...records.values()]
      .filter((record) => record.revoked)
      .map((record) => record.statusListIndex)
      .sort((left, right) => left - right);
  }

  return {
    assign,
    revoke,
    getRevokedIndexes,
  };
}
