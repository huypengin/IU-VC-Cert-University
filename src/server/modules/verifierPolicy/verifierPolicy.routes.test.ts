import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

import { createApp } from "../../app/createApp.js";
import { createVerifierPolicyRouter } from "./verifierPolicy.routes.js";
import type { VerifierPolicyDecision } from "./verifierPolicy.types.js";

const sampleVc = {
  issuer: "did:web:issuer.iu.example",
  credentialSubject: {
    id: "did:example:student123",
  },
};

async function withServer(
  run: (baseUrl: string) => Promise<void>,
  options: {
    evaluateVerifierPolicy?: () => Promise<VerifierPolicyDecision>;
  } = {},
): Promise<void> {
  const app = createApp({
    baseUrl: "http://localhost:8788",
    register(router) {
      router.use(
        createVerifierPolicyRouter({
          bearerToken: "secret",
          evaluateVerifierPolicy:
            options.evaluateVerifierPolicy ??
            (async () => ({
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
            })),
          logger: {
            info() {},
            warn() {},
            error() {},
          },
        }),
      );
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

async function postRequest(baseUrl: string, init: {
  authorization?: string;
  body?: string;
  contentType?: string;
}) {
  const headers = new Headers();
  if (init.authorization) {
    headers.set("Authorization", init.authorization);
  }
  if (init.contentType) {
    headers.set("Content-Type", init.contentType);
  }

  const response = await fetch(`${baseUrl}/api/verifier/policies/vc`, {
    method: "POST",
    headers,
    body: init.body,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

test("verifier policy route returns 401 without bearer auth", async () => {
  await withServer(async (baseUrl) => {
    const response = await postRequest(baseUrl, {
      contentType: "application/json",
      body: JSON.stringify(sampleVc),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      error: "unauthorized",
      error_description: "Missing or invalid bearer token",
    });
  });
});

test("verifier policy route returns 415 for non-json content", async () => {
  await withServer(async (baseUrl) => {
    const response = await postRequest(baseUrl, {
      authorization: "Bearer secret",
      contentType: "text/plain",
      body: JSON.stringify(sampleVc),
    });

    assert.equal(response.status, 415);
    assert.deepEqual(response.body, {
      error: "unsupported_media_type",
      error_description: "Content-Type must be application/json",
    });
  });
});

test("verifier policy route returns the service decision for valid requests", async () => {
  await withServer(
    async (baseUrl) => {
      const response = await postRequest(baseUrl, {
        authorization: "Bearer secret",
        contentType: "application/json",
        body: JSON.stringify(sampleVc),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(response.body, {
        decision: "accept",
        checks: {
          merkle: "passed",
          chain: "passed",
          revocation: "active",
          issuerTrust: "trusted",
        },
      });
    },
    {
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
    },
  );
});
