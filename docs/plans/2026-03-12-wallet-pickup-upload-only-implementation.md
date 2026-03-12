# Wallet Pickup Upload-Only Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the `main` Wallet Pickup tab require an uploaded VC JSON file and create offers through `POST /oid4vci/pickup-offer` instead of the visible subject-based GET flow.

**Architecture:** Keep the existing backend upload endpoint and hidden subject-based fallback intact. The frontend adds a small VC-file parsing helper, a POST pickup helper, and upload-driven Wallet Pickup state that resets stale offers when the selected file changes.

**Tech Stack:** React 19, TypeScript, Fetch API, `tsx --test`, existing OID4VCI upload endpoint

---

### Task 1: Document the upload-only wallet pickup scope

**Files:**
- Create: `docs/plans/2026-03-12-wallet-pickup-upload-only-design.md`
- Create: `docs/plans/2026-03-12-wallet-pickup-upload-only-implementation.md`
- Reference: `docs/plans/2026-03-10-user-supplied-vc-pickup-design.md`

**Step 1: Write the design doc**

Document the approved upload-only UI behavior, hidden backend fallback, local validation, and testing scope.

**Step 2: Write the implementation plan**

Break the change into TDD-sized tasks covering file parsing, POST helper wiring, Wallet Pickup UI changes, and verification commands.

**Step 3: Commit**

```bash
git add docs/plans/2026-03-12-wallet-pickup-upload-only-design.md docs/plans/2026-03-12-wallet-pickup-upload-only-implementation.md
git commit -m "docs: plan wallet pickup upload-only flow"
```

### Task 2: Add a pickup VC file parser

**Files:**
- Create: `src/ui/pickupVcFile.ts`
- Create: `src/ui/pickupVcFile.test.ts`

**Step 1: Write the failing test**

Create `src/ui/pickupVcFile.test.ts` with tests for:

```ts
test("parsePickupVcJson accepts a VC object and derives the detected subject id", () => {
  const parsed = parsePickupVcJson(
    JSON.stringify({
      id: "urn:uuid:test-vc",
      type: ["VerifiableCredential"],
      credentialSubject: { id: "did:example:student123" },
    }),
    "student.vc.json",
  );

  assert.equal(parsed.filename, "student.vc.json");
  assert.equal(parsed.subjectId, "did:example:student123");
});

test("parsePickupVcJson rejects invalid JSON", () => {
  assert.throws(() => parsePickupVcJson("{", "broken.json"), /json/i);
});

test("parsePickupVcJson rejects non-object payloads", () => {
  assert.throws(() => parsePickupVcJson('"hello"', "bad.json"), /vc/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/ui/pickupVcFile.test.ts
```

Expected: FAIL because the parser does not exist yet.

**Step 3: Write minimal implementation**

Create `src/ui/pickupVcFile.ts` with:

- a parsed upload view model containing `filename`, `vc`, and optional `subjectId`
- `parsePickupVcJson(text, filename)` that parses JSON, validates object shape, and derives `credentialSubject.id` when present

Keep validation minimal and specific to pickup UX.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/ui/pickupVcFile.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/pickupVcFile.ts src/ui/pickupVcFile.test.ts
git commit -m "test: add pickup vc file parser"
```

### Task 3: Add a POST pickup offer helper

**Files:**
- Modify: `src/ui/pickupApi.ts`
- Modify: `src/ui/pickupApi.test.ts`
- Reference: `src/oid4vci/oid4vci.controller.ts`

**Step 1: Write the failing test**

Add a test to `src/ui/pickupApi.test.ts`:

```ts
test("createPickupOfferFromVc posts the uploaded VC and derived subject id", async (t) => {
  let method = "";
  let body = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    method = init?.method ?? "";
    body = String(init?.body ?? "");
    return new Response(
      JSON.stringify({
        offerUri: "openid-credential-offer://?credential_offer=x",
        expiresInSec: 300,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await createPickupOfferFromVc({
    vc: { credentialSubject: { id: "did:example:student123" } },
    subjectId: "did:example:student123",
  });

  assert.equal(method, "POST");
  assert.match(body, /did:example:student123/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/ui/pickupApi.test.ts
```

Expected: FAIL because the POST helper does not exist yet.

**Step 3: Write minimal implementation**

Update `src/ui/pickupApi.ts` to add:

- `createPickupOfferFromVc({ vc, subjectId })`
- `POST /oid4vci/pickup-offer`
- JSON body with `vc` and optional `subject_id`

Do not remove the existing GET helper yet; keep it as hidden compatibility.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/ui/pickupApi.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/pickupApi.ts src/ui/pickupApi.test.ts
git commit -m "feat: add wallet pickup post helper"
```

### Task 4: Make the Wallet Pickup tab upload-only

**Files:**
- Modify: `src/ui/App.tsx`
- Create or Modify: `src/ui/batchIssuance.test.ts`
- Reference: `src/ui/pickupState.ts`

**Step 1: Write the failing test**

Add a UI test that proves:

- `Add to Wallet` is disabled before a VC file is loaded
- a valid uploaded VC enables the button
- the visible `Subject DID` input is no longer rendered

If there is no suitable UI test file, add a focused test file for Wallet Pickup interactions.

**Step 2: Run test to verify it fails**

Run the focused UI test command for the new or updated test file.

Expected: FAIL because the current Wallet Pickup tab still uses the subject input and GET helper.

**Step 3: Write minimal implementation**

Update `src/ui/App.tsx` to:

- replace `pickupSubjectId` state with uploaded-file state
- parse selected file locally before calling the API
- call `createPickupOfferFromVc(...)`
- show filename and detected subject DID when available
- disable `Add to Wallet` until a valid upload exists
- reset stale offer state when the file changes

Keep the existing QR/deep-link rendering and expiry countdown logic.

**Step 4: Run test to verify it passes**

Run the focused UI test command again.

Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/App.tsx src/ui/batchIssuance.test.ts
git commit -m "feat: make wallet pickup upload only"
```

### Task 5: Verify the full change

**Files:**
- Verify: `src/ui/pickupVcFile.test.ts`
- Verify: `src/ui/pickupApi.test.ts`
- Verify: the Wallet Pickup UI test file

**Step 1: Run focused tests**

Run:

```bash
npx tsx --test src/ui/pickupVcFile.test.ts src/ui/pickupApi.test.ts src/ui/batchIssuance.test.ts
```

Expected: PASS

**Step 2: Run broader regression tests**

Run:

```bash
npx tsx --test src/oid4vci/uploadedVcPickup.test.ts src/ui/pickupVcFile.test.ts src/ui/pickupApi.test.ts src/ui/batchIssuance.test.ts
```

Expected: PASS

**Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/ui/pickupVcFile.ts src/ui/pickupVcFile.test.ts src/ui/pickupApi.ts src/ui/pickupApi.test.ts src/ui/App.tsx docs/plans/2026-03-12-wallet-pickup-upload-only-design.md docs/plans/2026-03-12-wallet-pickup-upload-only-implementation.md
git commit -m "feat: support upload-only wallet pickup"
```
