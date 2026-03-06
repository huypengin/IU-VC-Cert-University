export interface TunnelConfig {
  baseUrl: string;
  port: number;
  authtoken?: string;
}

const DEFAULT_OID4VCI_PORT = 8787;

function normalizeBaseUrl(input: string): string {
  const raw = input.trim();
  if (!raw) {
    throw new Error("Invalid NGROK_DOMAIN: empty value");
  }

  const candidate = raw.includes("://") ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`Invalid NGROK_DOMAIN: ${input}`);
  }

  if (!url.hostname) {
    throw new Error(`Invalid NGROK_DOMAIN: ${input}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Invalid NGROK_DOMAIN: ${input}`);
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function parsePort(rawPort?: string): number {
  if (!rawPort?.trim()) return DEFAULT_OID4VCI_PORT;

  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid OID4VCI_PORT: ${rawPort}`);
  }
  return parsed;
}

export function parseTunnelConfig(
  env: Record<string, string | undefined>,
): TunnelConfig {
  const ngrokDomain = env.NGROK_DOMAIN?.trim();
  if (!ngrokDomain) {
    throw new Error("Missing required env var: NGROK_DOMAIN");
  }

  const baseUrl = normalizeBaseUrl(ngrokDomain);
  const port = parsePort(env.OID4VCI_PORT);
  const authtoken = env.NGROK_AUTHTOKEN?.trim() || undefined;

  return { baseUrl, port, authtoken };
}

export function buildNgrokArgs(config: TunnelConfig): string[] {
  const args = [
    "http",
    `http://127.0.0.1:${config.port}`,
    "--url",
    config.baseUrl,
  ];

  if (config.authtoken) {
    args.push("--authtoken", config.authtoken);
  }

  return args;
}

export function buildIssuerEnv(
  config: TunnelConfig,
  baseEnv: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return {
    ...baseEnv,
    BASE_URL: config.baseUrl,
    OID4VCI_PORT: String(config.port),
  };
}
