import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { buildIssuerEnv, buildNgrokArgs, parseTunnelConfig } from "./tunnelConfig.js";

function terminate(child: ChildProcess): void {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");
  }
}

async function main(): Promise<void> {
  const config = parseTunnelConfig(process.env);
  const issuerEnv = buildIssuerEnv(config, process.env);
  const ngrokArgs = buildNgrokArgs(config);

  console.log("[oid4vci:tunnel] Starting issuer server...");
  console.log(`[oid4vci:tunnel] BASE_URL=${config.baseUrl}`);
  console.log(`[oid4vci:tunnel] OID4VCI_PORT=${config.port}`);

  const issuer = spawn("npx", ["tsx", "src/oid4vci/server.ts"], {
    stdio: "inherit",
    env: issuerEnv,
    shell: process.platform === "win32",
  });

  console.log("[oid4vci:tunnel] Starting ngrok tunnel...");
  const ngrok = spawn("ngrok", ngrokArgs, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  let shuttingDown = false;

  const shutdown = (exitCode: number, reason: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[oid4vci:tunnel] ${reason}`);
    terminate(issuer);
    terminate(ngrok);
    setTimeout(() => process.exit(exitCode), 50);
  };

  process.on("SIGINT", () => shutdown(0, "Received SIGINT, stopping child processes."));
  process.on("SIGTERM", () => shutdown(0, "Received SIGTERM, stopping child processes."));

  issuer.on("error", (err) => {
    shutdown(1, `Issuer process error: ${String(err)}`);
  });
  ngrok.on("error", (err) => {
    shutdown(1, `Ngrok process error: ${String(err)}`);
  });

  issuer.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const details = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    shutdown(code ?? 1, `Issuer exited unexpectedly (${details}).`);
  });

  ngrok.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const details = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    shutdown(code ?? 1, `Ngrok exited unexpectedly (${details}).`);
  });
}

main().catch((err) => {
  console.error("[oid4vci:tunnel] Failed to start:", err);
  process.exit(1);
});
