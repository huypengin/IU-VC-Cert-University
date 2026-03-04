# Friendly VC OID4VCI Demo Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a non-technical OID4VCI pickup flow (deep link + QR) so users can add a VC to a wallet without manual `vc.json` import.

**Architecture:** Keep the existing issuer endpoints and add a pickup-friendly API response that includes a wallet-ready offer URI plus expiry metadata. Add a dedicated React pickup view that creates offers, renders QR/deep-link actions, and handles retry states. Keep wallet protocol logic in `src/oid4vci/**` and UI state/presentation in `src/ui/**`.

**Tech Stack:** TypeScript, Express, React 19, Vite, `tsx` test runner (Node test API), existing OID4VCI service/controller.

---

Execution principles:
- Follow `@superpowers/test-driven-development` for each code change.
- Run `@superpowers/verification-before-completion` before any "done" claim.
- Keep each commit scoped to one task.

### Task 1: Add Offer URI Builder Utility

**Files:**
- Create: `src/oid4vci/offerUri.ts`
- Create: `src/oid4vci/offerUri.test.ts`

**Step 1: Write the failing test**

```ts
// src/oid4vci/offerUri.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildCredentialOfferUri } from "./offerUri.js";

test("buildCredentialOfferUri encodes credential_offer JSON", () => {
  const uri = buildCredentialOfferUri({
    credential_issuer: "https://issuer.example",
    credential_configuration_ids: ["IU_Degree_JWTVC"],
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": "abc123",
        user_pin_required: false,
      },
    },
  });

  assert.match(uri, /^openid-credential-offer:\/\/\?credential_offer=/);
  assert.match(uri, /IU_Degree_JWTVC/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/oid4vci/offerUri.test.ts`  
Expected: FAIL with module/function not found for `buildCredentialOfferUri`.

**Step 3: Write minimal implementation**

```ts
// src/oid4vci/offerUri.ts
export interface CredentialOfferPayload {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants: Record<string, unknown>;
}

export function buildCredentialOfferUri(payload: CredentialOfferPayload): string {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  return `openid-credential-offer://?credential_offer=${encoded}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/oid4vci/offerUri.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/oid4vci/offerUri.ts src/oid4vci/offerUri.test.ts
git commit -m "feat: add OID4VCI credential offer URI builder"
```

### Task 2: Add Pickup-Friendly Offer Endpoint

**Files:**
- Modify: `src/oid4vci/oid4vci.controller.ts`
- Modify: `src/oid4vci/oid4vci.routes.ts`
- Modify: `src/oid4vci/oid4vci.service.ts`
- Create: `src/oid4vci/pickupOffer.test.ts`

**Step 1: Write the failing test**

```ts
// src/oid4vci/pickupOffer.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { createPickupOfferResponse } from "./oid4vci.service.js";

test("createPickupOfferResponse returns offer URI and expiry", () => {
  const res = createPickupOfferResponse("did:example:student123");
  assert.ok(res.offer);
  assert.match(res.offerUri, /^openid-credential-offer:\/\//);
  assert.equal(typeof res.expiresInSec, "number");
  assert.equal(res.expiresInSec > 0, true);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/oid4vci/pickupOffer.test.ts`  
Expected: FAIL because `createPickupOfferResponse` does not exist.

**Step 3: Write minimal implementation**

```ts
// in src/oid4vci/oid4vci.service.ts
import { buildCredentialOfferUri } from "./offerUri.js";

export function createPickupOfferResponse(subjectId: string) {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:8787";
  const code = createPreAuthCode(subjectId);
  const offer = {
    credential_issuer: baseUrl,
    credential_configuration_ids: ["IU_Degree_JWTVC"],
    grants: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": code,
        user_pin_required: false,
      },
    },
  };
  return {
    offer,
    offerUri: buildCredentialOfferUri(offer),
    expiresInSec: 300,
  };
}
```

```ts
// in src/oid4vci/oid4vci.controller.ts
export function getPickupOffer(req: Request, res: Response): void {
  const subjectId = ((req.query.subject_id as string) ?? "did:example:student123");
  res.json(createPickupOfferResponse(subjectId));
}
```

```ts
// in src/oid4vci/oid4vci.routes.ts
router.get("/oid4vci/pickup-offer", getPickupOffer);
```

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/oid4vci/pickupOffer.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/oid4vci/oid4vci.service.ts src/oid4vci/oid4vci.controller.ts src/oid4vci/oid4vci.routes.ts src/oid4vci/pickupOffer.test.ts
git commit -m "feat: add pickup-offer endpoint for wallet-friendly OID4VCI flow"
```

### Task 3: Build Pickup Page Logic in React

**Files:**
- Create: `src/ui/pickupApi.ts`
- Create: `src/ui/pickupApi.test.ts`
- Modify: `src/ui/App.tsx`

**Step 1: Write the failing test**

```ts
// src/ui/pickupApi.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { mapPickupOfferResponse } from "./pickupApi.js";

test("mapPickupOfferResponse validates required fields", () => {
  const mapped = mapPickupOfferResponse({
    offerUri: "openid-credential-offer://?credential_offer=x",
    expiresInSec: 300,
  });
  assert.equal(mapped.offerUri.startsWith("openid-credential-offer://"), true);
  assert.equal(mapped.expiresInSec, 300);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/ui/pickupApi.test.ts`  
Expected: FAIL because `mapPickupOfferResponse` does not exist.

**Step 3: Write minimal implementation**

```ts
// src/ui/pickupApi.ts
export interface PickupOfferVm {
  offerUri: string;
  expiresInSec: number;
}

export function mapPickupOfferResponse(raw: {
  offerUri: string;
  expiresInSec: number;
}): PickupOfferVm {
  if (!raw.offerUri?.startsWith("openid-credential-offer://")) {
    throw new Error("Invalid offer URI");
  }
  if (!Number.isFinite(raw.expiresInSec) || raw.expiresInSec <= 0) {
    throw new Error("Invalid offer expiry");
  }
  return raw;
}

export async function fetchPickupOffer(subjectId?: string): Promise<PickupOfferVm> {
  const qp = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : "";
  const res = await fetch(`/oid4vci/pickup-offer${qp}`);
  if (!res.ok) throw new Error(`Failed to create offer (${res.status})`);
  return mapPickupOfferResponse(await res.json());
}
```

Add pickup UI to `src/ui/App.tsx`:
- New tab: `Wallet Pickup`.
- Button: `Add to Wallet`.
- On click call `fetchPickupOffer`.
- Render:
  - Deep link button using `href={offerUri}`.
  - QR image via URL service for demo (e.g. `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(offerUri)}`).
  - Expiry countdown and `Generate new QR` action.

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/ui/pickupApi.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/pickupApi.ts src/ui/pickupApi.test.ts src/ui/App.tsx
git commit -m "feat: add wallet pickup tab with deep link and QR fallback"
```

### Task 4: Add Styling and User-Facing States

**Files:**
- Modify: `src/ui/styles.css`
- Create: `src/ui/pickupState.test.ts`
- Create: `src/ui/pickupState.ts`

**Step 1: Write the failing test**

```ts
// src/ui/pickupState.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { describeExpiryState } from "./pickupState.js";

test("describeExpiryState returns expired when timer is 0", () => {
  assert.equal(describeExpiryState(0), "expired");
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/ui/pickupState.test.ts`  
Expected: FAIL because `describeExpiryState` does not exist.

**Step 3: Write minimal implementation**

```ts
// src/ui/pickupState.ts
export type ExpiryState = "active" | "expiring" | "expired";

export function describeExpiryState(secondsLeft: number): ExpiryState {
  if (secondsLeft <= 0) return "expired";
  if (secondsLeft <= 30) return "expiring";
  return "active";
}
```

Update `src/ui/styles.css` with classes for:
- `.pickup-panel`
- `.pickup-actions`
- `.pickup-qr`
- `.expiry-active`, `.expiry-expiring`, `.expiry-expired`

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/ui/pickupState.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/pickupState.ts src/ui/pickupState.test.ts src/ui/styles.css
git commit -m "feat: add wallet pickup state model and status styling"
```

### Task 5: Document and Verify End-to-End Demo Flow

**Files:**
- Modify: `README.md`
- Create: `docs/oid4vci-wallet-demo.md`

**Step 1: Write a failing documentation check**

```bash
# Verify docs do NOT yet include pickup-offer flow
rg -n "pickup-offer|Add to Wallet|openid-credential-offer" README.md docs/oid4vci-wallet-demo.md
```

Expected: FAIL/no matches before docs update.

**Step 2: Run command to confirm gap**

Run: `rg -n "pickup-offer|Add to Wallet|openid-credential-offer" README.md docs || true`  
Expected: No wallet pickup runbook exists yet.

**Step 3: Write minimal implementation**

Update `README.md`:
- Add section: "Wallet Pickup Demo (OID4VCI)".
- Add exact startup commands:
  - `npm install`
  - `npm run oid4vci`
  - `npm run dev`
- Add user flow:
  - Open pickup tab
  - Click `Add to Wallet`
  - Scan QR or tap deep link
  - Retry if expired

Create `docs/oid4vci-wallet-demo.md`:
- Operator checklist
- Student checklist
- Troubleshooting for expired codes, wrong base URL, and wallet cannot resolve issuer.

**Step 4: Run verification commands**

Run:
- `npm run typecheck`
- `npm run build`
- `npx tsx --test src/oid4vci/offerUri.test.ts src/oid4vci/pickupOffer.test.ts src/ui/pickupApi.test.ts src/ui/pickupState.test.ts`

Expected:
- Typecheck PASS
- Build PASS
- All tests PASS

**Step 5: Commit**

```bash
git add README.md docs/oid4vci-wallet-demo.md
git commit -m "docs: add non-technical OID4VCI wallet pickup demo runbook"
```

### Final Verification Gate

Run:

```bash
npm run typecheck
npm run build
npx tsx --test src/oid4vci/offerUri.test.ts src/oid4vci/pickupOffer.test.ts src/ui/pickupApi.test.ts src/ui/pickupState.test.ts
git status --short
```

Expected:
- No failing checks.
- Only intentional uncommitted files (if any).
- Demo path is reproducible in under 60 seconds for a new user.
