import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const IU_ENV_KEYS = [
  "ISSUER_DID",
  "DEGREE_CONTEXT_URL",
  "IU_SMARTCERT_CONTEXT_URL",
  "MERKLE_CONTEXT_URL",
  "SCHEMA_URL",
  "CHAIN_ID",
  "RPC_URL",
  "CONTRACT_ADDRESS",
  "ISSUER_ED25519_PRIVATE_KEY",
] as const;

export default defineConfig(({ mode }) => {
  // Vite 7+ blocks envPrefix: "" (too easy to leak secrets). We explicitly inject only the keys we need.
  const env = loadEnv(mode, process.cwd(), "");

  const iuEnv: Record<string, string | undefined> = {};
  for (const key of IU_ENV_KEYS) iuEnv[key] = env[key];

  return {
    plugins: [react()],
    define: {
      __IU_ENV__: JSON.stringify(iuEnv),
    },
    server: {
      port: 5173,
    },
  };
});
