import "dotenv/config";

import { createApp } from "../app/createApp.js";
import { initKeys } from "../modules/oid4vci/keys.js";
import { registerOid4VCIServerRoutes } from "./oid4vciApp.js";
import {
  readOid4VCIServerEnv,
  readVerifierPolicyServerEnv,
} from "../shared/config/serverEnv.js";

async function main(): Promise<void> {
  const env = readOid4VCIServerEnv();
  const verifierPolicyEnv = readVerifierPolicyServerEnv();
  await initKeys();

  const app = createApp({
    baseUrl: env.baseUrl,
    register(router) {
      registerOid4VCIServerRoutes(router, {
        rpcUrl: verifierPolicyEnv.rpcUrl,
        trustedIssuers: verifierPolicyEnv.trustedIssuers,
      });
    },
  });

  app.listen(env.port, "0.0.0.0", () => {
    console.log(`\nOID4VCI issuer server running on port ${env.port}`);
    console.log(`BASE_URL = ${env.baseUrl}`);
    console.log(`GET  ${env.baseUrl}/.well-known/openid-credential-issuer`);
    console.log(`GET  ${env.baseUrl}/.well-known/openid-credential-issuer-draft11`);
    console.log(`GET  ${env.baseUrl}/.well-known/jwks.json`);
    console.log(`GET  ${env.baseUrl}/oid4vci/credential-offer`);
    console.log(`POST ${env.baseUrl}/oid4vci/pickup-offer`);
    console.log(`POST ${env.baseUrl}/oid4vci/token`);
    console.log(`POST ${env.baseUrl}/oid4vci/credential`);
    console.log(`POST ${env.baseUrl}/api/verifier/policies/vc`);
  });
}

main().catch((error) => {
  console.error("Failed to start OID4VCI server:", error);
  process.exit(1);
});
