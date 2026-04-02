import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

import { createApp } from "../app/createApp.js";
import { registerOid4VCIServerRoutes } from "./oid4vciApp.js";

const sampleVc = {
  issuer: "did:web:issuer.iu.example",
  credentialSubject: {
    id: "did:example:student123",
  },
};

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = createApp({
    baseUrl: "http://localhost:8787",
    register(router) {
      registerOid4VCIServerRoutes(router, {
        evaluateVerifierPolicy: async () => ({
          httpStatus: 200,
          body: {
            decision: "accept",
            checks: {
              merkle: "passed",
              chain: "passed",
              revocation: "active",
              issuerTrust: "trusted",
            },
          },
          logCategory: "accept",
        }),
        logger: {
          info() {},
          warn() {},
          error() {},
        },
      });
    },
  });

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

test("oid4vci app exposes verifier policy route on the same server", async () => {
  await withServer(async (baseUrl) => {
    const nonceResponse = await fetch(`${baseUrl}/oid4vci/nonce`);
    const nonceBody = await nonceResponse.json();

    const policyResponse = await fetch(`${baseUrl}/api/verifier/policies/vc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sampleVc),
    });
    const policyBody = await policyResponse.json();

    assert.equal(nonceResponse.status, 200);
    assert.equal(typeof nonceBody.c_nonce, "string");
    assert.equal(policyResponse.status, 200);
    assert.deepEqual(policyBody, {
      decision: "accept",
      checks: {
        merkle: "passed",
        chain: "passed",
        revocation: "active",
        issuerTrust: "trusted",
      },
    });
  });
});
