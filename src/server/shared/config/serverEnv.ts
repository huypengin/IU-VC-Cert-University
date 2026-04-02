type EnvRecord = Record<string, string | undefined>;

export type Oid4VCIServerEnv = {
  port: number;
  baseUrl: string;
};

export type VerifierPolicyServerEnv = {
  port: number;
  baseUrl: string;
  rpcUrl?: string;
  trustedIssuers: string[];
};

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTrustedIssuers(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((issuer) => issuer.trim())
    .filter(Boolean);
}

function resolveTrustedIssuers(env: EnvRecord): string[] {
  const configuredIssuers = parseTrustedIssuers(env.VERIFIER_POLICY_TRUSTED_ISSUERS);
  const issuerDid = env.ISSUER_DID?.trim();

  if (!issuerDid) {
    return configuredIssuers;
  }

  return [...new Set([...configuredIssuers, issuerDid])];
}

export function readOid4VCIServerEnv(env: EnvRecord = process.env): Oid4VCIServerEnv {
  const port = parsePort(env.OID4VCI_PORT ?? env.PORT, 8787);
  const baseUrl =
    env.DEV ? `http://localhost:${port}` : env.BASE_URL ?? `http://localhost:${port}`;

  return {
    port,
    baseUrl,
  };
}

export function readVerifierPolicyServerEnv(
  env: EnvRecord = process.env,
): VerifierPolicyServerEnv {
  const port = parsePort(env.VERIFIER_POLICY_PORT ?? env.PORT, 8788);
  const baseUrl = env.BASE_URL ?? `http://localhost:${port}`;

  return {
    port,
    baseUrl,
    rpcUrl: env.VERIFIER_POLICY_RPC_URL?.trim() || undefined,
    trustedIssuers: resolveTrustedIssuers(env),
  };
}
