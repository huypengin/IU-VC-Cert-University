import test from "node:test";
import assert from "node:assert/strict";

import { createBearerAuth } from "./bearerAuth.js";

async function runBearerAuth(input: {
  authorization?: string;
  expectedToken: string;
}) {
  let statusCode = 200;
  let jsonBody: unknown;
  let nextCalled = false;

  const middleware = createBearerAuth(input.expectedToken);

  await middleware(
    {
      headers: input.authorization
        ? { authorization: input.authorization }
        : {},
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
    () => {
      nextCalled = true;
    },
  );

  return {
    statusCode,
    jsonBody,
    nextCalled,
  };
}

test("createBearerAuth rejects requests with no authorization header", async () => {
  const result = await runBearerAuth({
    expectedToken: "secret",
  });

  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.jsonBody, {
    error: "unauthorized",
    error_description: "Missing or invalid bearer token",
  });
  assert.equal(result.nextCalled, false);
});

test("createBearerAuth rejects requests with the wrong bearer token", async () => {
  const result = await runBearerAuth({
    authorization: "Bearer wrong",
    expectedToken: "secret",
  });

  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test("createBearerAuth allows requests with the configured bearer token", async () => {
  const result = await runBearerAuth({
    authorization: "Bearer secret",
    expectedToken: "secret",
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.nextCalled, true);
});
