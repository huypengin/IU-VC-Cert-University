# OID4VCI Ngrok Tunnel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a single command that starts OID4VCI issuer API with a stable public ngrok URL and correct `BASE_URL` wiring for wallet metadata and credential endpoints.

**Architecture:** Introduce a thin wrapper process that starts both issuer and ngrok CLI, while keeping parsing/validation logic in a pure config module for TDD coverage. The wrapper sets `BASE_URL` from normalized ngrok URL and coordinates lifecycle/termination of child processes.

**Tech Stack:** TypeScript, Node.js `child_process`, `node:test`, `tsx`, existing Express issuer server.

---

### Task 1: Add tunnel config parser (TDD)

**Files:**
- Create: `src/oid4vci/tunnelConfig.ts`
- Create: `src/oid4vci/tunnelConfig.test.ts`

**Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseTunnelConfig } from "./tunnelConfig.js";

test("normalizes host-only NGROK_DOMAIN to https URL", () => {
  const cfg = parseTunnelConfig({ NGROK_DOMAIN: "demo.ngrok-free.app" });
  assert.equal(cfg.baseUrl, "https://demo.ngrok-free.app");
});
```

Add tests for:
- full URL input
- trailing slash trimming
- default port `8787`
- invalid `NGROK_DOMAIN` throws

**Step 2: Run tests to verify RED**

Run: `npx tsx --test src/oid4vci/tunnelConfig.test.ts`  
Expected: FAIL (`parseTunnelConfig` missing)

**Step 3: Implement minimal parser**

```ts
export function parseTunnelConfig(env: Record<string, string | undefined>) {
  // validate NGROK_DOMAIN, normalize URL, parse OID4VCI_PORT, return config
}
```

**Step 4: Run tests to verify GREEN**

Run: `npx tsx --test src/oid4vci/tunnelConfig.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/oid4vci/tunnelConfig.ts src/oid4vci/tunnelConfig.test.ts
git commit -m "feat: add ngrok tunnel config parser"
```

### Task 2: Add wrapper command to run issuer + ngrok

**Files:**
- Create: `src/oid4vci/startWithNgrok.ts`
- Modify: `package.json`

**Step 1: Write failing test for command arg builder**

Create a focused test in `src/oid4vci/tunnelConfig.test.ts` (or a new test file) for:
- issuer env should include normalized `BASE_URL`
- ngrok args should include `http`, `http://127.0.0.1:<port>`, `--url`, `<baseUrl>`

Run: `npx tsx --test src/oid4vci/tunnelConfig.test.ts`  
Expected: FAIL (builder/helper missing)

**Step 2: Implement minimal wrapper**

Implement `startWithNgrok.ts`:
- parse config
- spawn issuer: `npx tsx src/oid4vci/server.ts` with injected `BASE_URL`
- spawn ngrok: `ngrok http http://127.0.0.1:<port> --url <baseUrl> [--authtoken ...]`
- forward stdio
- handle SIGINT/SIGTERM and child exits

Add script:

```json
{
  "oid4vci:tunnel": "tsx src/oid4vci/startWithNgrok.ts"
}
```

**Step 3: Run test suite**

Run: `npx tsx --test src/oid4vci/tunnelConfig.test.ts src/oid4vci/pickupOffer.test.ts src/ui/pickupApi.test.ts`  
Expected: PASS

**Step 4: Manual smoke check**

Run: `npm run oid4vci:tunnel`  
Expected:
- issuer logs show `BASE_URL` with ngrok domain
- ngrok tunnel starts using same URL

**Step 5: Commit**

```bash
git add src/oid4vci/startWithNgrok.ts package.json
git commit -m "feat: add oid4vci ngrok wrapper command"
```

### Task 3: Documentation and env updates

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/oid4vci-wallet-demo.md`

**Step 1: Update env docs**

Add:
- `NGROK_DOMAIN` (required for `oid4vci:tunnel`)
- `NGROK_AUTHTOKEN` (optional if already configured in ngrok CLI)

**Step 2: Update runbook commands**

Document:
- `npm run oid4vci:tunnel`
- keep `npm run dev` in separate terminal

**Step 3: Verify docs references**

Run: `rg -n "oid4vci:tunnel|NGROK_DOMAIN|NGROK_AUTHTOKEN" README.md docs/oid4vci-wallet-demo.md .env.example`  
Expected: matches in all 3 files

**Step 4: Full verification**

Run:
- `npm run typecheck`
- `npx tsx --test src/oid4vci/tunnelConfig.test.ts src/oid4vci/pickupOffer.test.ts src/ui/pickupApi.test.ts`

Expected: all pass

**Step 5: Commit**

```bash
git add .env.example README.md docs/oid4vci-wallet-demo.md
git commit -m "docs: add oid4vci ngrok tunnel setup"
```
