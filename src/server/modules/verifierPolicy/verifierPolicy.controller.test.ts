import test from "node:test";
import assert from "node:assert/strict";

import { createVerifierPolicyController } from "./verifierPolicy.controller.js";

test("createVerifierPolicyController logs dependency failures internally", async () => {
  const calls: Array<{ level: string; message: string; data: unknown }> = [];
  const controller = createVerifierPolicyController({
    evaluateVerifierPolicy: async () => ({
      httpStatus: 503,
      body: {
        decision: "reject",
        reason: "RPC unavailable",
        checks: {
          merkle: "passed",
          chain: "indeterminate",
          revocation: "indeterminate",
          issuerTrust: "trusted",
        },
      },
      logCategory: "dependency_failure",
    }),
    logger: {
      info(message, data) {
        calls.push({ level: "info", message, data });
      },
      warn(message, data) {
        calls.push({ level: "warn", message, data });
      },
      error(message, data) {
        calls.push({ level: "error", message, data });
      },
    },
  });

  let statusCode = 200;
  let jsonBody: unknown;

  await controller(
    {
      body: {
        issuer: "did:web:issuer.iu.example",
      },
      is(type: string) {
        return type === "application/json";
      },
    } as any,
    {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: unknown) {
        jsonBody = body;
        return this;
      },
    } as any,
    (() => undefined) as any,
  );

  assert.equal(statusCode, 503);
  assert.deepEqual(jsonBody, {
    decision: "reject",
    reason: "RPC unavailable",
    checks: {
      merkle: "passed",
      chain: "indeterminate",
      revocation: "indeterminate",
      issuerTrust: "trusted",
    },
  });
  assert.deepEqual(calls, [
    {
      level: "error",
      message: "verifier_policy_dependency_failure",
      data: {
        httpStatus: 503,
        body: jsonBody,
      },
    },
  ]);
});
