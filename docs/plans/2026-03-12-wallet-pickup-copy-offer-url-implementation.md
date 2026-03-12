# Wallet Pickup Copy Offer URL Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Wallet Pickup deep-link action with a copyable offer URL action while keeping QR generation and backend behavior unchanged.

**Architecture:** Keep the change local to the frontend. Add a tiny clipboard helper for testable copy behavior, render the raw `offerUri` in the pickup panel, and pass copy feedback state from `App.tsx` into `WalletPickupPanel`.

**Tech Stack:** React 19, TypeScript, browser Clipboard API, `tsx --test`, server-side React markup tests

---

### Task 1: Document the copy-offer-url follow-up

**Files:**
- Create: `docs/plans/2026-03-12-wallet-pickup-copy-offer-url-design.md`
- Create: `docs/plans/2026-03-12-wallet-pickup-copy-offer-url-implementation.md`
- Reference: `docs/plans/2026-03-12-wallet-pickup-upload-only-design.md`

**Step 1: Write the design doc**

Document the approved UX change: remove the deep-link action, add a copy button, render the offer URI, and keep QR behavior unchanged.

**Step 2: Write the implementation plan**

Break the work into TDD-sized tasks for the clipboard helper, panel markup updates, and final verification.

**Step 3: Commit**

```bash
git add docs/plans/2026-03-12-wallet-pickup-copy-offer-url-design.md docs/plans/2026-03-12-wallet-pickup-copy-offer-url-implementation.md
git commit -m "docs: plan wallet pickup copy offer url flow"
```

### Task 2: Add a testable clipboard helper

**Files:**
- Create: `src/ui/offerClipboard.ts`
- Create: `src/ui/offerClipboard.test.ts`

**Step 1: Write the failing test**

Create `src/ui/offerClipboard.test.ts` with tests for:

```ts
test("copyOfferUrl writes the offer URI to the clipboard", async () => {
  let copied = "";
  await copyOfferUrl({ writeText: async (value) => { copied = value; } }, "openid-credential-offer://x");
  assert.equal(copied, "openid-credential-offer://x");
});

test("copyOfferUrl throws a clear error when clipboard is unavailable", async () => {
  await assert.rejects(() => copyOfferUrl(undefined, "openid-credential-offer://x"), /clipboard/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/ui/offerClipboard.test.ts
```

Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

Create `src/ui/offerClipboard.ts` with:

- a narrow clipboard-like interface using `writeText`
- `copyOfferUrl(clipboard, offerUri)` that writes the URI or throws a clear error when clipboard support is unavailable

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/ui/offerClipboard.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/offerClipboard.ts src/ui/offerClipboard.test.ts
git commit -m "test: add wallet pickup offer clipboard helper"
```

### Task 3: Replace the deep-link action with a copy button

**Files:**
- Modify: `src/ui/WalletPickupPanel.tsx`
- Modify: `src/ui/WalletPickupPanel.test.tsx`
- Modify: `src/ui/App.tsx`
- Reference: `src/ui/styles.css`

**Step 1: Write the failing test**

Update `src/ui/WalletPickupPanel.test.tsx` to prove:

- `Open Wallet Deep Link` is no longer rendered
- `Copy Offer URL` is rendered
- the raw `offerUri` text is rendered in the panel
- copy feedback text is shown when provided

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/ui/WalletPickupPanel.test.tsx
```

Expected: FAIL because the current panel still renders the deep-link action.

**Step 3: Write minimal implementation**

Update `src/ui/WalletPickupPanel.tsx` to:

- replace the anchor with a `Copy Offer URL` button
- render the visible `offerUri`
- render copy feedback when present

Update `src/ui/App.tsx` to:

- track copy feedback state
- call `copyOfferUrl(navigator.clipboard, pickupOffer.offerUri)`
- clear stale feedback when generating a new offer or changing files

Reuse existing styling where practical and keep QR behavior unchanged.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/ui/WalletPickupPanel.test.tsx src/ui/offerClipboard.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/WalletPickupPanel.tsx src/ui/WalletPickupPanel.test.tsx src/ui/App.tsx src/ui/offerClipboard.ts src/ui/offerClipboard.test.ts
git commit -m "feat: replace wallet pickup deep link with copy action"
```

### Task 4: Verify the change

**Files:**
- Verify: `src/ui/offerClipboard.test.ts`
- Verify: `src/ui/WalletPickupPanel.test.tsx`
- Verify: existing pickup UI tests

**Step 1: Run focused tests**

Run:

```bash
npx tsx --test src/ui/offerClipboard.test.ts src/ui/WalletPickupPanel.test.tsx src/ui/pickupApi.test.ts src/ui/pickupVcFile.test.ts
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
git add src/ui/App.tsx src/ui/WalletPickupPanel.tsx src/ui/WalletPickupPanel.test.tsx src/ui/offerClipboard.ts src/ui/offerClipboard.test.ts docs/plans/2026-03-12-wallet-pickup-copy-offer-url-design.md docs/plans/2026-03-12-wallet-pickup-copy-offer-url-implementation.md
git commit -m "feat: support copying wallet pickup offer urls"
```
