# Sphereon StatusList2021 Revocation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Sphereon-compatible `StatusList2021` revocation path to issued credentials while keeping the existing IU-specific Merkle and smart-contract verification model available as secondary evidence.

**Architecture:** Keep the existing OID4VCI JWT issuance pipeline, but extend the canonical VC shape and JWT mapping to include a standard `credentialStatus` entry. Add a small issuer-side status-list module plus public HTTP endpoints for a `StatusList2021Credential`, then wire revocation mutations through that module so wallet clients can resolve status from a standard source. Stabilize the existing JWT tests first by removing the implicit dependency on a repo-root `vc.json` file in worktree environments.

**Tech Stack:** TypeScript, Node.js `node:test`, Express, Vite, OID4VCI JWT issuance, W3C VC data model, `StatusList2021`

---

### Task 1: Stabilize JWT VC fixture loading for worktrees and tests

**Files:**
- Modify: `src/oid4vci/oid4vci.service.ts`
- Modify: `src/oid4vci/jwtSigningAlg.test.ts`
- Create: `src/oid4vci/__fixtures__/jwt-vc.json`

**Step 1: Write the failing test**

Add a test case to `src/oid4vci/jwtSigningAlg.test.ts` that sets a temporary `VC_JSON_PATH` environment variable and asserts `buildJwtVc()` reads from that path instead of hard-coding `process.cwd()/vc.json`.

```ts
test("buildJwtVc reads canonical VC from VC_JSON_PATH when provided", async () => {
  process.env.VC_JSON_PATH = fixturePath;
  const jwt = await buildJwtVc(tokenMeta);
  const payload = jose.decodeJwt(jwt);
  assert.equal(payload.jti, "urn:uuid:test-statuslist-fixture");
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/oid4vci/jwtSigningAlg.test.ts`
Expected: FAIL because `buildJwtVc()` still only reads `process.cwd()/vc.json`.

**Step 3: Write minimal implementation**

Update `src/oid4vci/oid4vci.service.ts` so the canonical VC path is:

```ts
const vcPath = process.env.VC_JSON_PATH
  ? resolve(process.env.VC_JSON_PATH)
  : resolve(process.cwd(), "vc.json");
```

Add a minimal fixture file in `src/oid4vci/__fixtures__/jwt-vc.json` containing the fields the JWT builder needs (`id`, `type`, `credentialSubject`, `credentialStatus`, `evidence` optional).

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/oid4vci/jwtSigningAlg.test.ts`
Expected: PASS

**Step 5: Run the broader existing suite**

Run: `npx tsx --test src/oid4vci/*.test.ts src/ui/*.test.ts src/vc/*.test.ts`
Expected: PASS, including the previously failing JWT-signing test.

**Step 6: Commit**

```bash
git add src/oid4vci/oid4vci.service.ts src/oid4vci/jwtSigningAlg.test.ts src/oid4vci/__fixtures__/jwt-vc.json
git commit -m "test: stabilize jwt vc loading for worktree tests"
```

### Task 2: Add standard `StatusList2021Entry` support to VC assembly and JWT mapping

**Files:**
- Modify: `src/vc/types.ts`
- Modify: `src/vc/assembleVc.ts`
- Modify: `src/oid4vci/oid4vci.service.ts`
- Modify: `src/schemas/1.1/schema/schema-iu-cert.json`
- Modify: `src/schemas/__generated__/VC_document.example.ts`
- Modify: `src/schemas/__generated__/schema.example.ts`
- Create: `src/vc/statusList.test.ts`

**Step 1: Write the failing test**

Create `src/vc/statusList.test.ts` covering two behaviors:

```ts
test("assembleVc includes StatusList2021Entry when status config is provided", () => {
  const vc = assembleVc(inputWithStatusConfig);
  assert.equal(vc.credentialStatus?.type, "StatusList2021Entry");
  assert.equal(vc.credentialStatus?.statusPurpose, "revocation");
});

test("buildJwtVc preserves credentialStatus in vc payload", async () => {
  const jwt = await buildJwtVc(tokenMeta);
  const payload = jose.decodeJwt(jwt);
  assert.equal((payload.vc as any).credentialStatus.type, "StatusList2021Entry");
});
```

**Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/vc/statusList.test.ts src/oid4vci/jwtSigningAlg.test.ts`
Expected: FAIL because `UnsignedVc` and JWT payload mapping do not yet carry `credentialStatus`.

**Step 3: Write minimal implementation**

- Extend `src/vc/types.ts` with explicit `StatusList2021Entry` typing in `UnsignedVc`.
- Update `assembleVc()` to accept a status-list config input and emit:

```ts
credentialStatus: {
  id: `${statusListCredential}#${statusListIndex}`,
  type: "StatusList2021Entry",
  statusPurpose: "revocation",
  statusListCredential,
  statusListIndex: String(statusListIndex),
}
```

- Update `buildJwtVc()` so `payload.vc` includes `credentialStatus` from the canonical VC.
- Replace the custom on-chain status example in schema/example artifacts with `StatusList2021Entry`.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/vc/statusList.test.ts src/oid4vci/jwtSigningAlg.test.ts`
Expected: PASS

**Step 5: Run the broader suite**

Run: `npx tsx --test src/oid4vci/*.test.ts src/ui/*.test.ts src/vc/*.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/vc/types.ts src/vc/assembleVc.ts src/oid4vci/oid4vci.service.ts src/schemas/1.1/schema/schema-iu-cert.json src/schemas/__generated__/VC_document.example.ts src/schemas/__generated__/schema.example.ts src/vc/statusList.test.ts
git commit -m "feat: add statuslist2021 credential status to issued vcs"
```

### Task 3: Publish a public `StatusList2021Credential` endpoint

**Files:**
- Create: `src/oid4vci/statusList.ts`
- Create: `src/oid4vci/statusList.test.ts`
- Modify: `src/oid4vci/oid4vci.controller.ts`
- Modify: `src/oid4vci/oid4vci.routes.ts`
- Modify: `src/oid4vci/issuerMetadata.test.ts`

**Step 1: Write the failing test**

Create `src/oid4vci/statusList.test.ts` to verify list generation and controller output:

```ts
test("buildStatusListCredential returns a StatusList2021Credential with encoded list", () => {
  const doc = buildStatusListCredential({
    baseUrl: "https://issuer.example",
    listId: "degree-2026",
    revokedIndexes: [2, 9],
  });
  assert.equal(doc.type.includes("StatusList2021Credential"), true);
  assert.equal(doc.credentialSubject.encodedList.length > 0, true);
});

test("getStatusListCredential serves the configured list URL", () => {
  getStatusListCredential(req, res);
  assert.equal(payload.type.includes("StatusList2021Credential"), true);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/oid4vci/statusList.test.ts src/oid4vci/issuerMetadata.test.ts`
Expected: FAIL because no status-list module or route exists yet.

**Step 3: Write minimal implementation**

- Add `src/oid4vci/statusList.ts` with:
  - `buildStatusListCredential()`
  - deterministic bitset encoding helper
  - environment-driven list URL / identifier resolution
- Add a controller handler such as:

```ts
export function getStatusListCredential(_req: Request, res: Response): void {
  res.json(buildStatusListCredential(loadStatusListState()));
}
```

- Register a public route such as:

```ts
router.get("/status/degree/2026", getStatusListCredential);
```

- Extend issuer metadata tests if any metadata/display field should reference the status-list-backed credential profile.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/oid4vci/statusList.test.ts src/oid4vci/issuerMetadata.test.ts`
Expected: PASS

**Step 5: Run build verification**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/oid4vci/statusList.ts src/oid4vci/statusList.test.ts src/oid4vci/oid4vci.controller.ts src/oid4vci/oid4vci.routes.ts src/oid4vci/issuerMetadata.test.ts
git commit -m "feat: publish statuslist2021 credential endpoint"
```

### Task 4: Wire revocation updates through issuer-managed status state

**Files:**
- Create: `src/oid4vci/statusListStore.ts`
- Create: `src/oid4vci/statusListStore.test.ts`
- Modify: `src/oid4vci/statusList.ts`
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/pickupState.test.ts` or create a targeted UI/status test if needed

**Step 1: Write the failing test**

Create a store test that exercises index assignment and revocation mutation:

```ts
test("status list store marks a credential index revoked", () => {
  const store = createStatusListStore();
  store.assign("urn:uuid:test-1", 12);
  store.revoke("urn:uuid:test-1");
  assert.deepEqual(store.getRevokedIndexes(), [12]);
});
```

If the current UI is responsible for generating the canonical VC before wallet pickup, add a UI-level test that ensures generated VC payloads include a stable `credentialStatus` index.

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/oid4vci/statusListStore.test.ts`
Expected: FAIL because there is no issuer-managed status state yet.

**Step 3: Write minimal implementation**

- Add a small store abstraction that can:
  - assign a status index to a credential ID
  - mark an assigned index revoked
  - expose revoked indexes to `buildStatusListCredential()`
- Keep initial storage minimal and explicit:

```ts
type StatusRecord = {
  credentialId: string;
  statusListIndex: number;
  revoked: boolean;
};
```

- Thread this state into VC assembly so issued credentials get a durable `statusListIndex`.
- If no admin/API revoke flow exists yet, expose a narrow internal function and document that current revocation updates are issuer-managed, not end-user self-service.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/oid4vci/statusListStore.test.ts src/vc/statusList.test.ts src/oid4vci/statusList.test.ts`
Expected: PASS

**Step 5: Run full verification**

Run: `npx tsx --test src/oid4vci/*.test.ts src/ui/*.test.ts src/vc/*.test.ts`
Expected: PASS

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/oid4vci/statusListStore.ts src/oid4vci/statusListStore.test.ts src/oid4vci/statusList.ts src/ui/App.tsx src/ui/pickupState.test.ts src/vc/statusList.test.ts
git commit -m "feat: track issuer revocation state for statuslist2021"
```

### Task 5: Update documentation and operator guidance

**Files:**
- Modify: `README.md`
- Modify: `docs/issuer-architecture.md`
- Modify: `docs/wallet-verification-import-flow.md`
- Create: `docs/statuslist-revocation.md`

**Step 1: Write the failing doc check**

Run a text search before editing:

Run: `rg -n "StatusList2021|credentialStatus|never expired|revocation" README.md docs/issuer-architecture.md docs/wallet-verification-import-flow.md docs/statuslist-revocation.md`
Expected: FAIL because `docs/statuslist-revocation.md` does not exist and the current docs do not explain the new dual-mode revocation model.

**Step 2: Write minimal documentation**

Document:
- wallet-facing `StatusList2021Entry`
- separation between temporal validity and revocation
- issuer endpoint for the status list
- the fact that smart-contract revocation remains IU-specific secondary verification

**Step 3: Run doc verification**

Run: `rg -n "StatusList2021|credentialStatus|temporal validity|smart-contract revocation" README.md docs/issuer-architecture.md docs/wallet-verification-import-flow.md docs/statuslist-revocation.md`
Expected: all target files contain the expected terminology

**Step 4: Commit**

```bash
git add README.md docs/issuer-architecture.md docs/wallet-verification-import-flow.md docs/statuslist-revocation.md
git commit -m "docs: add status list revocation guidance for Sphereon wallet"
```

