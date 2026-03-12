/**
 * OID4VCI Express Server – entry point.
 *
 * Usage:
 *   npm run oid4vci
 *   # or: npx tsx src/oid4vci/server.ts
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { initKeys } from "./keys.js";
import oid4vciRoutes from "./oid4vci.routes.js";

const PORT = Number(process.env.PORT) || Number(process.env.OID4VCI_PORT) || 8787;
const BASE_URL = process.env.DEV ? `http://localhost:${PORT}` : process.env.BASE_URL;

async function main(): Promise<void> {
  // Initialise OID4VCI JWT signing keys
  await initKeys();

  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount OID4VCI routes
  app.use(oid4vciRoutes);

  // Health check
  app.get("/health", (_req: express.Request, res: express.Response) => {
    res.json({ status: "ok", issuer: BASE_URL });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 OID4VCI Issuer Server running on port ${PORT}`);
    console.log(`   BASE_URL = ${BASE_URL}`);
    console.log(`\n📋 Endpoints:`);
    console.log(`   GET  ${BASE_URL}/.well-known/openid-credential-issuer`);
    console.log(`   GET  ${BASE_URL}/.well-known/openid-credential-issuer-draft11`);
    console.log(`   GET  ${BASE_URL}/.well-known/jwks.json`);
    console.log(`   GET  ${BASE_URL}/oid4vci/credential-offer`);
    console.log(`   POST ${BASE_URL}/oid4vci/token`);
    console.log(`   POST ${BASE_URL}/oid4vci/credential`);
    console.log("");
  });
}

main().catch((err) => {
  console.error("Failed to start OID4VCI server:", err);
  process.exit(1);
});
