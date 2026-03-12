# OID4VCI Metadata Versioning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split issuer metadata by draft version so the default well-known endpoint is pure Draft 13 and a separate legacy endpoint preserves Draft 11 compatibility.

**Architecture:** Extract explicit metadata builders/handlers instead of returning one mixed JSON object. Keep `credential_configuration_ids` offers unchanged, serve Draft 13 metadata from the standard well-known endpoint, and expose a second legacy Draft 11 endpoint for older wallets.

**Tech Stack:** TypeScript, Express, `tsx --test`, existing OID4VCI controller/routes

---

### Task 1: Document the metadata versioning change

**Files:**
- Create: `docs/plans/2026-03-12-oid4vci-metadata-versioning-design.md`
- Create: `docs/plans/2026-03-12-oid4vci-metadata-versioning-implementation.md`
- Reference: `src/oid4vci/oid4vci.controller.ts`

**Step 1: Write the design doc**

Document the approved split: default Draft 13 metadata on the standard endpoint and a separate legacy Draft 11 endpoint.

**Step 2: Write the implementation plan**

Break the work into TDD-sized steps for metadata tests, controller changes, route wiring, and verification.

**Step 3: Commit**

```bash
git add docs/plans/2026-03-12-oid4vci-metadata-versioning-design.md docs/plans/2026-03-12-oid4vci-metadata-versioning-implementation.md
git commit -m "docs: plan oid4vci metadata versioning"
```

### Task 2: Add failing tests for pure Draft 13 and legacy Draft 11 metadata

**Files:**
- Modify: `src/oid4vci/issuerMetadata.test.ts`
- Reference: `src/oid4vci/oid4vci.controller.ts`

**Step 1: Write the failing test**

Extend `src/oid4vci/issuerMetadata.test.ts` with tests that prove:

```ts
test("default issuer metadata omits credentials_supported", () => {
  const payload = captureJson(getIssuerMetadata);
  assert.equal("credentials_supported" in payload, false);
});

test("legacy issuer metadata exposes credentials_supported", () => {
  const payload = captureJson(getIssuerMetadataDraft11);
  assert.ok(Array.isArray(payload.credentials_supported));
});
```

Keep the existing credential type assertions for the Draft 13 config as regressions.

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/oid4vci/issuerMetadata.test.ts
```

Expected: FAIL because the current default metadata still includes `credentials_supported` and there is no legacy handler yet.

**Step 3: Write minimal implementation**

No implementation in this task.

**Step 4: Commit**

Skip commit until the implementation is green.

### Task 3: Implement versioned metadata handlers and route wiring

**Files:**
- Modify: `src/oid4vci/oid4vci.controller.ts`
- Modify: `src/oid4vci/oid4vci.routes.ts`
- Modify: `src/oid4vci/server.ts`
- Modify: `src/oid4vci/issuerMetadata.test.ts`

**Step 1: Write minimal implementation**

Update `src/oid4vci/oid4vci.controller.ts` to:

- extract shared metadata fields
- make `getIssuerMetadata()` return only Draft 13 metadata
- add `getIssuerMetadataDraft11()` for legacy metadata

Update `src/oid4vci/oid4vci.routes.ts` to add:

```ts
router.get("/.well-known/openid-credential-issuer-draft11", getIssuerMetadataDraft11);
```

Update `src/oid4vci/server.ts` endpoint logging to mention the legacy metadata route.

**Step 2: Run test to verify it passes**

Run:

```bash
npx tsx --test src/oid4vci/issuerMetadata.test.ts
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/oid4vci/oid4vci.controller.ts src/oid4vci/oid4vci.routes.ts src/oid4vci/server.ts src/oid4vci/issuerMetadata.test.ts
git commit -m "feat: version oid4vci issuer metadata by draft"
```

### Task 4: Verify the OID4VCI flow still builds

**Files:**
- Verify: `src/oid4vci/issuerMetadata.test.ts`
- Verify: `src/oid4vci/uploadedVcPickup.test.ts`
- Verify: `src/oid4vci/offerUri.test.ts`

**Step 1: Run focused tests**

Run:

```bash
npx tsx --test src/oid4vci/issuerMetadata.test.ts src/oid4vci/uploadedVcPickup.test.ts src/oid4vci/offerUri.test.ts
```

Expected: PASS

**Step 2: Run build**

Run:

```bash
npm run build
```

Expected: PASS

**Step 3: Commit**

```bash
git add docs/plans/2026-03-12-oid4vci-metadata-versioning-design.md docs/plans/2026-03-12-oid4vci-metadata-versioning-implementation.md src/oid4vci/issuerMetadata.test.ts src/oid4vci/oid4vci.controller.ts src/oid4vci/oid4vci.routes.ts src/oid4vci/server.ts
git commit -m "fix: serve pure draft13 oid4vci metadata by default"
```
