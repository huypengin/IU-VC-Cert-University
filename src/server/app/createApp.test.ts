import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { Router } from "express";

import { createApp } from "./createApp.js";

async function withServer(
  app: ReturnType<typeof createApp>,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = app.listen(0, "127.0.0.1");

  await new Promise<void>((resolve, reject) => {
    server.once("listening", () => resolve());
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}

async function requestJson(baseUrl: string, path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  return {
    status: response.status,
    body: await response.json(),
  };
}

test("createApp mounts /health and injected routers", async () => {
  const app = createApp({
    baseUrl: "http://localhost:8787",
    register(router) {
      const demo = Router();
      demo.get("/demo", (_req, res) => {
        res.json({ ok: true });
      });
      router.use(demo);
    },
  });

  await withServer(app, async (baseUrl) => {
    const health = await requestJson(baseUrl, "/health");
    const demo = await requestJson(baseUrl, "/demo");

    assert.equal(health.status, 200);
    assert.deepEqual(health.body, {
      status: "ok",
      issuer: "http://localhost:8787",
    });
    assert.equal(demo.status, 200);
    assert.deepEqual(demo.body, { ok: true });
  });
});
