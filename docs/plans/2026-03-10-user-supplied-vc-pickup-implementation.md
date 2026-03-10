# User-Supplied VC Pickup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fragile root `vc.json` wallet-pickup handoff with a user-supplied VC flow, while keeping verification file-based and avoiding any database or durable backend credential store.

**Architecture:** The browser becomes the source of the VC artifact for both verification and QR generation. The OID4VCI backend keeps only TTL-bound in-memory VC snapshots linked to the pre-authorized-code/token flow, so `/oid4vci/credential` signs from the uploaded VC instead of reading `process.cwd()/vc.json`.

**Tech Stack:** React 19, TypeScript, Express, node:test via `tsx --test`, jose, existing OID4VCI in-memory maps

---

### Task 1: Add a transient uploaded-VC session model to OID4VCI

**Files:**
- Modify: `src/oid4vci/oid4vci.service.ts`
- Create: `src/oid4vci/uploadedVcPickup.test.ts`
- Reference: `src/oid4vci/tokenNonce.test.ts`

**Step 1: Write the failing test**

Create `src/oid4vci/uploadedVcPickup.test.ts` with tests for:

```ts
test("createPickupOfferResponseFromVc stores the uploaded VC against the pre-authorized code", () => {
  const res = createPickupOfferResponseFromVc({
    subjectId: "did:example:student123",
    vc: {
      id: "urn:uuid:test-vc",
      credentialSubject: { id: "did:example:student123" },
      type: ["VerifiableCredential", "VNEduDegreeCredential"],
    },
  });

  const code =
    res.offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"]["pre-authorized_code"];

  const token = exchangeCodeForToken(code);
  const snapshot = getUploadedVcForAccessToken(token.access_token);

  assert.equal(snapshot.id, "urn:uuid:test-vc");
});

test("exchangeCodeForToken fails later when no uploaded VC is linked to the token", () => {
  const code = createPreAuthCode("did:example:student123");
  const token = exchangeCodeForToken(code);
  assert.throws(() => getUploadedVcForAccessToken(token.access_token), /uploaded vc/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/oid4vci/uploadedVcPickup.test.ts
```

Expected: FAIL because the uploaded VC helpers do not exist yet.

**Step 3: Write minimal implementation**

Update `src/oid4vci/oid4vci.service.ts` to:

- add a new `UploadedVcSnapshot` type
- extend `PreAuthEntry` and `TokenEntry` with an optional uploaded VC reference or snapshot
- add a new helper:

```ts
export function createPickupOfferResponseFromVc(input: {
  subjectId: string;
  vc: Record<string, unknown>;
}) { /* create pre-auth entry linked to uploaded VC */ }
```

- add a new helper:

```ts
export function getUploadedVcForAccessToken(token: string): Record<string, unknown> { /* read snapshot or throw */ }
```

Keep storage strictly in memory and reuse the existing TTL model.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/oid4vci/uploadedVcPickup.test.ts
```

Expected: PASS

**Step 5: Run regression tests**

Run:

```bash
npx tsx --test src/oid4vci/tokenNonce.test.ts src/oid4vci/pickupOffer.test.ts src/oid4vci/uploadedVcPickup.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/oid4vci/oid4vci.service.ts src/oid4vci/uploadedVcPickup.test.ts
git commit -m "feat: add transient uploaded vc pickup store"
```

### Task 2: Make JWT issuance read from the uploaded VC snapshot instead of root vc.json

**Files:**
- Modify: `src/oid4vci/oid4vci.service.ts`
- Modify: `src/oid4vci/jwtSigningAlg.test.ts`
- Modify: `src/oid4vci/uploadedVcPickup.test.ts`

**Step 1: Write the failing test**

Add a test to `src/oid4vci/uploadedVcPickup.test.ts`:

```ts
test("buildJwtVc uses the uploaded VC linked to the access token instead of process.cwd()/vc.json", async () => {
  const res = createPickupOfferResponseFromVc({
    subjectId: "did:example:student123",
    vc: {
      id: "urn:uuid:uploaded-vc",
      type: ["VerifiableCredential", "VNEduDegreeCredential"],
      credentialSubject: { id: "did:example:student123", degree: { name: "BSc" } },
    },
  });

  const code =
    res.offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"]["pre-authorized_code"];
  const token = exchangeCodeForToken(code);
  const jwt = await buildJwtVc(validateAccessToken(token.access_token));
  const payload = jose.decodeJwt(jwt);

  assert.equal((payload.vc as any).credentialSubject.id, "did:example:student123");
  assert.equal(payload.jti, "urn:uuid:uploaded-vc");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/oid4vci/uploadedVcPickup.test.ts src/oid4vci/jwtSigningAlg.test.ts
```

Expected: FAIL because `buildJwtVc()` still reads `vc.json` from disk.

**Step 3: Write minimal implementation**

Update `src/oid4vci/oid4vci.service.ts` so `buildJwtVc(tokenMeta)`:

- resolves the uploaded VC snapshot from `tokenMeta`
- throws a descriptive error if the token has no uploaded VC
- builds the JWT payload from that snapshot instead of `readFileSync(resolve(process.cwd(), "vc.json"))`

Remove the root `vc.json` dependency from the live pickup path, but do not expand scope into unrelated OID4VCI payload redesign.

Update `src/oid4vci/jwtSigningAlg.test.ts` to construct a tokenMeta that includes or resolves a test VC snapshot.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/oid4vci/uploadedVcPickup.test.ts src/oid4vci/jwtSigningAlg.test.ts
```

Expected: PASS

**Step 5: Run regression tests**

Run:

```bash
npx tsx --test src/oid4vci/tokenNonce.test.ts src/oid4vci/pickupOffer.test.ts src/oid4vci/uploadedVcPickup.test.ts src/oid4vci/jwtSigningAlg.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/oid4vci/oid4vci.service.ts src/oid4vci/jwtSigningAlg.test.ts src/oid4vci/uploadedVcPickup.test.ts
git commit -m "feat: issue wallet pickup credentials from uploaded vc"
```

### Task 3: Add a POST pickup-offer endpoint that accepts a user-supplied VC

**Files:**
- Modify: `src/oid4vci/oid4vci.controller.ts`
- Modify: `src/oid4vci/oid4vci.routes.ts`
- Modify: `src/oid4vci/uploadedVcPickup.test.ts`

**Step 1: Write the failing test**

Add a controller-level test to `src/oid4vci/uploadedVcPickup.test.ts` or a new `src/oid4vci/pickupOfferUpload.test.ts`:

```ts
test("postPickupOffer returns an offer for an uploaded VC payload", () => {
  const req = {
    body: {
      subject_id: "did:example:student123",
      vc: {
        id: "urn:uuid:test-vc",
        credentialSubject: { id: "did:example:student123" },
      },
    },
  } as any;

  let statusCode = 200;
  let jsonBody: unknown;
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(body: unknown) { jsonBody = body; return this; },
  } as any;

  postPickupOffer(req, res);

  assert.equal(statusCode, 200);
  assert.match((jsonBody as any).offerUri, /^openid-credential-offer:\/\//);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/oid4vci/uploadedVcPickup.test.ts
```

Expected: FAIL because there is no `POST /oid4vci/pickup-offer` handler yet.

**Step 3: Write minimal implementation**

Update `src/oid4vci/oid4vci.controller.ts`:

- add `postPickupOffer(req, res)`
- validate `req.body.vc`
- derive `subjectId` from `req.body.subject_id ?? req.body.vc.credentialSubject?.id ?? "did:example:student123"`
- call `createPickupOfferResponseFromVc(...)`

Update `src/oid4vci/oid4vci.routes.ts`:

- keep the existing `GET /oid4vci/pickup-offer`
- add `POST /oid4vci/pickup-offer`

Return `400` for malformed body rather than a generic `500`.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/oid4vci/uploadedVcPickup.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/oid4vci/oid4vci.controller.ts src/oid4vci/oid4vci.routes.ts src/oid4vci/uploadedVcPickup.test.ts
git commit -m "feat: accept uploaded vcs for pickup offers"
```

### Task 4: Add file-based pickup API helpers in the browser

**Files:**
- Modify: `src/ui/pickupApi.ts`
- Modify: `src/ui/pickupApi.test.ts`
- Create: `src/ui/vcFile.ts`
- Create: `src/ui/vcFile.test.ts`

**Step 1: Write the failing tests**

Create `src/ui/vcFile.test.ts` with tests for:

```ts
test("parseVcJsonText parses a VC JSON string", () => {
  const vc = parseVcJsonText('{"id":"urn:uuid:test","credentialSubject":{"id":"did:example:student123"}}');
  assert.equal(vc.id, "urn:uuid:test");
});

test("parseVcJsonText rejects invalid JSON", () => {
  assert.throws(() => parseVcJsonText("{"), /invalid json/i);
});
```

Update `src/ui/pickupApi.test.ts` with:

```ts
test("createPickupOfferFromVc posts the uploaded VC to the issuer API", async (t) => {
  // assert POST /oid4vci/pickup-offer with JSON body { vc, subject_id? }
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/ui/vcFile.test.ts src/ui/pickupApi.test.ts
```

Expected: FAIL because the new helper and API call do not exist yet.

**Step 3: Write minimal implementation**

Create `src/ui/vcFile.ts` with:

- `parseVcJsonText(text: string): Record<string, unknown>`

Update `src/ui/pickupApi.ts` with:

- `createPickupOfferFromVc(input: { vc: Record<string, unknown>; subjectId?: string }): Promise<PickupOfferVm>`

Implementation details:

- send `POST` to `/oid4vci/pickup-offer`
- `Content-Type: application/json`
- body contains `{ vc, subject_id }`
- keep `mapPickupOfferResponse(...)`

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/ui/vcFile.test.ts src/ui/pickupApi.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/pickupApi.ts src/ui/pickupApi.test.ts src/ui/vcFile.ts src/ui/vcFile.test.ts
git commit -m "feat: add file based pickup api helpers"
```

### Task 5: Switch verify and pickup UI to user-supplied VC files

**Files:**
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/chainStatus.test.ts`
- Modify: `src/ui/vcFile.test.ts`
- Reference: `src/revocation/request.ts`

**Step 1: Write the failing test**

If a full React test is too heavy for the current stack, add a small pure helper in `src/ui/vcFile.ts` and test it first:

```ts
test("getSubjectIdFromVc falls back safely when credentialSubject.id is absent", () => {
  assert.equal(getSubjectIdFromVc({ credentialSubject: {} }), undefined);
});
```

Then use that helper in the UI.

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/ui/vcFile.test.ts
```

Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

Update `src/ui/App.tsx` to:

- add file inputs for verify and pickup flows
- parse uploaded VC files through `parseVcJsonText(...)`
- keep the parsed VC in component state
- drive `verifyVC(...)` and `buildRevocationRequestFromVc(...)` from that parsed VC object
- call `createPickupOfferFromVc(...)` for QR generation
- stop treating pasted JSON and root `vc.json` as the primary operational path

Keep scope narrow:

- no new persistence
- no drag-and-drop redesign
- no unrelated UI cleanup

**Step 4: Run focused tests and build**

Run:

```bash
npx tsx --test src/ui/vcFile.test.ts src/ui/pickupApi.test.ts src/ui/chainStatus.test.ts src/verifier/revocation.test.ts
npm run build
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/App.tsx src/ui/vcFile.ts src/ui/vcFile.test.ts src/ui/pickupApi.ts src/ui/pickupApi.test.ts
git commit -m "feat: switch verify and pickup to file based vcs"
```

### Task 6: Update operator docs and final regression coverage

**Files:**
- Modify: `README.md`
- Modify: `docs/issuer-architecture.md`
- Modify: `docs/oid4vci-wallet-demo.md`
- Modify: `docs/verification-logic.md`

**Step 1: Update docs**

Document:

- verification now prefers uploaded VC files
- QR generation now uploads the selected VC to a transient in-memory pickup session
- no database is introduced
- pending offers are lost on backend restart
- root `vc.json` is no longer the live wallet pickup source

**Step 2: Run final regression commands**

Run:

```bash
npx tsx --test src/oid4vci/tokenNonce.test.ts src/oid4vci/pickupOffer.test.ts src/oid4vci/uploadedVcPickup.test.ts src/oid4vci/jwtSigningAlg.test.ts src/ui/pickupApi.test.ts src/ui/vcFile.test.ts src/ui/chainStatus.test.ts src/verifier/revocation.test.ts
npm run build
```

Expected: PASS

**Step 3: Commit**

```bash
git add README.md docs/issuer-architecture.md docs/oid4vci-wallet-demo.md docs/verification-logic.md
git commit -m "docs: describe user supplied vc pickup flow"
```
