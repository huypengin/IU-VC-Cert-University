# Verifier Policy Webhook Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a modular Express-based verifier-policy webhook endpoint for `walt.id` and reorganize the server code under `src/server/**` so future server modules can be added cleanly.

**Architecture:** Introduce a shared server app layer, move the existing OID4VCI server code into a module under `src/server/modules/oid4vci`, and add a new `verifierPolicy` module with route/controller/service boundaries. The webhook service stays transport-lean and delegates IU-specific verification work to reusable code in `src/verifier/**`.

**Tech Stack:** Express 4, TypeScript, Node `crypto`, existing verifier logic in `src/verifier/**`, `tsx --test`

---

### Task 1: Save the approved design and implementation docs

**Files:**
- Create: `docs/plans/2026-03-18-verifier-policy-webhook-design.md`
- Create: `docs/plans/2026-03-18-verifier-policy-webhook-implementation.md`

**Step 1: Write the design doc**

Document the approved module structure, webhook contract, policy pipeline, config, and testing scope.

**Step 2: Write the implementation plan**

Document the TDD task breakdown for the server refactor and webhook module.

**Step 3: Commit**

```bash
git add docs/plans/2026-03-18-verifier-policy-webhook-design.md docs/plans/2026-03-18-verifier-policy-webhook-implementation.md
git commit -m "docs: plan verifier policy webhook"
```

### Task 2: Add the shared server app foundation

**Files:**
- Create: `src/server/app/createApp.ts`
- Create: `src/server/app/createApp.test.ts`
- Create: `src/server/shared/http/errorResponse.ts`

**Step 1: Write the failing test**

Create `src/server/app/createApp.test.ts` with a focused test proving the app factory can mount module routers and expose `/health`:

```ts
test("createApp mounts health and injected routers", async () => {
  const app = createApp({
    baseUrl: "http://localhost:8787",
    mount: (router) => {
      router.get("/demo", (_req, res) => res.json({ ok: true }));
    },
  });

  const health = await requestJson(app, "GET", "/health");
  const demo = await requestJson(app, "GET", "/demo");

  assert.equal(health.status, 200);
  assert.deepEqual(demo.body, { ok: true });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/server/app/createApp.test.ts
```

Expected: FAIL because the app factory does not exist yet.

**Step 3: Write minimal implementation**

Create `createApp.ts` with:

- Express app creation
- `cors()`
- `express.json()`
- `express.urlencoded({ extended: true })`
- `/health` returning `{ status: "ok", issuer: baseUrl }`
- a small module-mount callback so entrypoints can compose features

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/server/app/createApp.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/server/app/createApp.ts src/server/app/createApp.test.ts src/server/shared/http/errorResponse.ts
git commit -m "refactor: add shared server app factory"
```

### Task 3: Move OID4VCI into the modular server layout

**Files:**
- Create: `src/server/modules/oid4vci/oid4vci.routes.ts`
- Create: `src/server/modules/oid4vci/oid4vci.controller.ts`
- Create: `src/server/modules/oid4vci/oid4vci.service.ts`
- Create: `src/server/modules/oid4vci/keys.ts`
- Create: `src/server/modules/oid4vci/offerUri.ts`
- Create: `src/server/entries/oid4vci.server.ts`
- Modify: existing OID4VCI tests to import from the new module paths

**Step 1: Write the failing test**

Pick one existing OID4VCI test, such as `src/oid4vci/uploadedVcPickup.test.ts`, and update its imports to the new module path first.

Example:

```ts
import { createPickupOfferResponseFromVc } from "../server/modules/oid4vci/oid4vci.service.js";
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/oid4vci/uploadedVcPickup.test.ts
```

Expected: FAIL because the module has not been moved yet.

**Step 3: Write minimal implementation**

Move the OID4VCI server code under `src/server/modules/oid4vci/**` and add `src/server/entries/oid4vci.server.ts` that uses the shared app factory.

Keep behavior unchanged:

- same well-known endpoints
- same pickup routes
- same health shape

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/oid4vci/uploadedVcPickup.test.ts src/oid4vci/issuerMetadata.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/server/modules/oid4vci src/server/entries/oid4vci.server.ts src/oid4vci/*.test.ts
git commit -m "refactor: move oid4vci server into module layout"
```

### Task 4: Add bearer auth middleware for server modules

**Files:**
- Create: `src/server/shared/security/bearerAuth.ts`
- Create: `src/server/shared/security/bearerAuth.test.ts`

**Step 1: Write the failing test**

Create `src/server/shared/security/bearerAuth.test.ts` with tests for:

```ts
test("requireBearerToken rejects missing authorization header", async () => {
  const result = await runBearerAuth({ headers: {} }, "secret");
  assert.equal(result.status, 401);
});

test("requireBearerToken accepts the configured bearer token", async () => {
  const result = await runBearerAuth(
    { headers: { authorization: "Bearer secret" } },
    "secret",
  );
  assert.equal(result.nextCalled, true);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/server/shared/security/bearerAuth.test.ts
```

Expected: FAIL because the middleware does not exist yet.

**Step 3: Write minimal implementation**

Create middleware that:

- requires `Authorization: Bearer ...`
- compares tokens with constant-time logic
- returns a stable `401` JSON error response on failure

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/server/shared/security/bearerAuth.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/server/shared/security/bearerAuth.ts src/server/shared/security/bearerAuth.test.ts
git commit -m "feat: add bearer auth middleware"
```

### Task 5: Add verifier-policy service decision mapping

**Files:**
- Create: `src/server/modules/verifierPolicy/verifierPolicy.service.ts`
- Create: `src/server/modules/verifierPolicy/verifierPolicy.types.ts`
- Create: `src/server/modules/verifierPolicy/verifierPolicy.service.test.ts`
- Reference: `src/verifier/receiptResolver.ts`
- Reference: `src/verifier/merkleVerification.ts`
- Reference: `src/verifier/chainVerification.ts`

**Step 1: Write the failing test**

Create `src/server/modules/verifierPolicy/verifierPolicy.service.test.ts` with injected-dependency tests for:

```ts
test("evaluateVerifierPolicy returns accept when issuer trust, merkle, and chain checks pass", async () => {
  const result = await evaluateVerifierPolicy(sampleVc, deps);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.body.decision, "accept");
});

test("evaluateVerifierPolicy returns 409 when the VC is revoked", async () => {
  const result = await evaluateVerifierPolicy(sampleVc, revokedDeps);
  assert.equal(result.httpStatus, 409);
  assert.equal(result.body.checks.revocation, "revoked");
});

test("evaluateVerifierPolicy returns 503 for RPC failures", async () => {
  const result = await evaluateVerifierPolicy(sampleVc, rpcFailureDeps);
  assert.equal(result.httpStatus, 503);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/server/modules/verifierPolicy/verifierPolicy.service.test.ts
```

Expected: FAIL because the service does not exist yet.

**Step 3: Write minimal implementation**

Create a service that:

- validates VC-like input
- extracts issuer
- applies optional issuer allowlist trust logic
- resolves the receipt
- runs Merkle verification
- runs chain/revocation verification
- returns `{ httpStatus, body, logCategory }`

Do not call the browser-oriented `verifyVC()` wrapper directly.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/server/modules/verifierPolicy/verifierPolicy.service.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/server/modules/verifierPolicy/verifierPolicy.service.ts src/server/modules/verifierPolicy/verifierPolicy.types.ts src/server/modules/verifierPolicy/verifierPolicy.service.test.ts
git commit -m "feat: add verifier policy decision service"
```

### Task 6: Add verifier-policy controller and route wiring

**Files:**
- Create: `src/server/modules/verifierPolicy/verifierPolicy.controller.ts`
- Create: `src/server/modules/verifierPolicy/verifierPolicy.routes.ts`
- Create: `src/server/modules/verifierPolicy/verifierPolicy.routes.test.ts`
- Create: `src/server/entries/verifierPolicy.server.ts`

**Step 1: Write the failing test**

Create `src/server/modules/verifierPolicy/verifierPolicy.routes.test.ts` proving:

- `POST /api/verifier/policies/vc` rejects missing bearer auth with `401`
- rejects non-JSON requests with `415` or `422` according to the controller contract
- returns `200` when the service accepts

Example:

```ts
test("verifier policy route returns 401 without bearer auth", async () => {
  const response = await invokeRoute(app, {
    method: "POST",
    path: "/api/verifier/policies/vc",
    body: sampleVc,
  });

  assert.equal(response.status, 401);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/server/modules/verifierPolicy/verifierPolicy.routes.test.ts
```

Expected: FAIL because the route does not exist yet.

**Step 3: Write minimal implementation**

Add:

- controller that validates JSON body shape
- route wiring for `POST /api/verifier/policies/vc`
- shared bearer auth middleware
- entrypoint that boots the module through the shared app factory

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/server/modules/verifierPolicy/verifierPolicy.routes.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/server/modules/verifierPolicy/verifierPolicy.controller.ts src/server/modules/verifierPolicy/verifierPolicy.routes.ts src/server/modules/verifierPolicy/verifierPolicy.routes.test.ts src/server/entries/verifierPolicy.server.ts
git commit -m "feat: add verifier policy webhook route"
```

### Task 7: Add server configuration helpers and startup wiring

**Files:**
- Create: `src/server/shared/config/serverEnv.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

Add a small test in `src/server/modules/verifierPolicy/verifierPolicy.routes.test.ts` or a dedicated config test proving required env values are enforced for verifier-policy startup.

**Step 2: Run test to verify it fails**

Run the focused config test command.

Expected: FAIL because the config helper does not exist yet.

**Step 3: Write minimal implementation**

Create a server-env helper that reads:

- `BASE_URL`
- `VERIFIER_POLICY_PORT`
- `VERIFIER_POLICY_BEARER_TOKEN`
- `VERIFIER_POLICY_RPC_URL`
- `VERIFIER_POLICY_TRUSTED_ISSUERS`

Add package scripts:

```json
{
  "oid4vci": "tsx src/server/entries/oid4vci.server.ts",
  "verifier-policy": "tsx src/server/entries/verifierPolicy.server.ts"
}
```

**Step 4: Run test to verify it passes**

Run the focused config test command again.

Expected: PASS

**Step 5: Commit**

```bash
git add src/server/shared/config/serverEnv.ts package.json
git commit -m "feat: add verifier policy server config"
```

### Task 8: Verify the full change

**Files:**
- Verify: `src/server/app/createApp.test.ts`
- Verify: `src/server/shared/security/bearerAuth.test.ts`
- Verify: `src/server/modules/verifierPolicy/verifierPolicy.service.test.ts`
- Verify: `src/server/modules/verifierPolicy/verifierPolicy.routes.test.ts`
- Verify: existing OID4VCI tests

**Step 1: Run focused tests**

Run:

```bash
npx tsx --test src/server/app/createApp.test.ts src/server/shared/security/bearerAuth.test.ts src/server/modules/verifierPolicy/verifierPolicy.service.test.ts src/server/modules/verifierPolicy/verifierPolicy.routes.test.ts
```

Expected: PASS

**Step 2: Run broader regression tests**

Run:

```bash
npx tsx --test src/**/*.test.ts
```

Expected: PASS

**Step 3: Run build verification**

Run:

```bash
npm run build
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/server package.json docs/plans/2026-03-18-verifier-policy-webhook-design.md docs/plans/2026-03-18-verifier-policy-webhook-implementation.md
git commit -m "feat: add verifier policy webhook module"
```
