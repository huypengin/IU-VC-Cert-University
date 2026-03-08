# OID4VCI Registry ES256 Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make OID4VCI-issued JWT VCs use the same ES256 algorithm and verification method `kid` as the registry DID document for the issuer.

**Architecture:** Treat `OID4VCI_PRIVATE_JWK` as the registry-backed signing source of truth. Import the configured ES256 JWK, preserve its `kid` exactly, and let both JWT issuance and issuer metadata read the active signing state from `src/oid4vci/keys.ts`.

**Tech Stack:** TypeScript, `jose`, `node:test`, `tsx`, existing OID4VCI Express handlers.

---

### Task 1: Prove JWT header alignment for ES256 registry keys

**Files:**
- Create: `src/oid4vci/jwtSigningAlg.test.ts`
- Modify: `src/oid4vci/issuerMetadata.test.ts`

**Step 1: Write the failing test**

Add a test that:
- sets `process.env.OID4VCI_PRIVATE_JWK` to an EC P-256 JWK
- uses `kid: "did:web:infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle#key-1"`
- calls `initKeys()`
- builds a JWT via `buildJwtVc()`
- asserts the protected header equals:

```ts
assert.equal(header.alg, "ES256");
assert.equal(
  header.kid,
  "did:web:infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle#key-1",
);
```

Update issuer metadata coverage so the same ES256 configuration expects:

```ts
assert.deepEqual(cfg.credential_signing_alg_values_supported, ["ES256"]);
```

**Step 2: Run tests to verify RED**

Run:

```bash
npx tsx --test src/oid4vci/jwtSigningAlg.test.ts src/oid4vci/issuerMetadata.test.ts
```

Expected: FAIL because current local behavior is still oriented around the Ed25519 path.

**Step 3: Commit**

```bash
git add src/oid4vci/jwtSigningAlg.test.ts src/oid4vci/issuerMetadata.test.ts
git commit -m "test: cover oid4vci registry es256 headers"
```

### Task 2: Align key initialization with registry ES256 configuration

**Files:**
- Modify: `src/oid4vci/keys.ts`
- Modify: `src/oid4vci/oid4vci.service.ts`
- Modify: `src/oid4vci/oid4vci.controller.ts`

**Step 1: Implement minimal code**

In `src/oid4vci/keys.ts`:
- keep `OID4VCI_PRIVATE_JWK` as the highest-priority input
- infer `ES256` from EC P-256 JWKs
- import the JWK using the inferred algorithm
- preserve `kid` exactly as configured
- expose the inferred algorithm through `getSigningAlg()`

In `src/oid4vci/oid4vci.service.ts`:
- build JWT protected headers from `getSigningAlg()` and `getKid()`

In `src/oid4vci/oid4vci.controller.ts`:
- advertise `credential_signing_alg_values_supported` from `getSigningAlg()`

**Step 2: Run tests to verify GREEN**

Run:

```bash
npx tsx --test src/oid4vci/jwtSigningAlg.test.ts src/oid4vci/issuerMetadata.test.ts src/oid4vci/keys.test.ts
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/oid4vci/keys.ts src/oid4vci/oid4vci.service.ts src/oid4vci/oid4vci.controller.ts src/oid4vci/keys.test.ts
git commit -m "feat: align oid4vci jwt with registry es256 did"
```

### Task 3: Verify no regression in OID4VCI flow

**Files:**
- Verify only

**Step 1: Run focused verification**

Run:

```bash
npx tsx --test src/oid4vci/jwtSigningAlg.test.ts src/oid4vci/issuerMetadata.test.ts src/oid4vci/keys.test.ts src/oid4vci/tokenNonce.test.ts src/oid4vci/pickupOffer.test.ts
```

Expected: PASS

**Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add docs/plans/2026-03-08-oid4vci-registry-es256-design.md docs/plans/2026-03-08-oid4vci-registry-es256-implementation.md
git commit -m "docs: add oid4vci registry es256 plan"
```
