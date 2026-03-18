import "dotenv/config";

import { createApp } from "../app/createApp.js";
import { createVerifierPolicyRouter } from "../modules/verifierPolicy/verifierPolicy.routes.js";
import { readVerifierPolicyServerEnv } from "../shared/config/serverEnv.js";

async function main(): Promise<void> {
  const env = readVerifierPolicyServerEnv();

  const app = createApp({
    baseUrl: env.baseUrl,
    register(router) {
      router.use(
        createVerifierPolicyRouter({
          bearerToken: env.bearerToken,
          rpcUrl: env.rpcUrl,
          trustedIssuers: env.trustedIssuers,
        }),
      );
    },
  });

  app.listen(env.port, "0.0.0.0", () => {
    console.log(`\nVerifier policy server running on port ${env.port}`);
    console.log(`BASE_URL = ${env.baseUrl}`);
    console.log(`POST ${env.baseUrl}/api/verifier/policies/vc`);
  });
}

main().catch((error) => {
  console.error("Failed to start verifier policy server:", error);
  process.exit(1);
});
