const LEGACY_REGISTRY_HOST = "iu-smartcert.ngrok-free.dev";
const CURRENT_REGISTRY_HOST = "infra-vc-registry-web-911368042037.asia-east2.run.app";

export function normalizeRegistryUrl(value: string): string {
  return value.replaceAll(LEGACY_REGISTRY_HOST, CURRENT_REGISTRY_HOST);
}

