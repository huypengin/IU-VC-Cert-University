import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIssuerEnv,
  buildNgrokArgs,
  parseTunnelConfig,
} from "./tunnelConfig.js";

test("parseTunnelConfig normalizes host-only NGROK_DOMAIN to https base URL", () => {
  const cfg = parseTunnelConfig({
    NGROK_DOMAIN: "demo.ngrok-free.app",
  });
  assert.equal(cfg.baseUrl, "https://demo.ngrok-free.app");
});

test("parseTunnelConfig accepts full https URL and trims trailing slash", () => {
  const cfg = parseTunnelConfig({
    NGROK_DOMAIN: "https://demo.ngrok-free.app/",
  });
  assert.equal(cfg.baseUrl, "https://demo.ngrok-free.app");
});

test("parseTunnelConfig defaults OID4VCI_PORT to 8787", () => {
  const cfg = parseTunnelConfig({
    NGROK_DOMAIN: "demo.ngrok-free.app",
  });
  assert.equal(cfg.port, 8787);
});

test("parseTunnelConfig throws on missing NGROK_DOMAIN", () => {
  assert.throws(
    () => parseTunnelConfig({}),
    /Missing required env var: NGROK_DOMAIN/,
  );
});

test("parseTunnelConfig throws on invalid NGROK_DOMAIN", () => {
  assert.throws(
    () => parseTunnelConfig({ NGROK_DOMAIN: "not a url @@@" }),
    /Invalid NGROK_DOMAIN/,
  );
});

test("buildNgrokArgs includes --url and optional authtoken", () => {
  const cfg = parseTunnelConfig({
    NGROK_DOMAIN: "demo.ngrok-free.app",
    OID4VCI_PORT: "8787",
    NGROK_AUTHTOKEN: "token-123",
  });
  assert.deepEqual(buildNgrokArgs(cfg), [
    "http",
    "http://127.0.0.1:8787",
    "--url",
    "https://demo.ngrok-free.app",
    "--authtoken",
    "token-123",
  ]);
});

test("buildIssuerEnv injects BASE_URL and OID4VCI_PORT", () => {
  const cfg = parseTunnelConfig({
    NGROK_DOMAIN: "demo.ngrok-free.app",
    OID4VCI_PORT: "8788",
  });
  const env = buildIssuerEnv(cfg, { EXISTING: "x" });
  assert.equal(env.BASE_URL, "https://demo.ngrok-free.app");
  assert.equal(env.OID4VCI_PORT, "8788");
  assert.equal(env.EXISTING, "x");
});
