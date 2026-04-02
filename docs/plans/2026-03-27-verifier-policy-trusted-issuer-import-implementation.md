# Verifier Policy Trusted Issuer Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure delegated verifier policy checks include the active issuer in the local trusted-issuer list derived from environment configuration.

**Architecture:** Keep `VERIFIER_POLICY_TRUSTED_ISSUERS` as the authoritative local configuration input, but merge the active issuer identity into the parsed verifier-policy env output so both verifier-policy entrypoints consume the same trusted list. Make the merge deterministic and deduplicated in the shared config layer.

**Tech Stack:** TypeScript, Node.js test runner, Express server config

---

### Task 1: Add parser regression coverage

**Files:**
- Modify: `src/server/shared/config/serverEnv.test.ts`

**Step 1: Write the failing test**

Add coverage proving `readVerifierPolicyServerEnv()` includes `ISSUER_DID` in `trustedIssuers` and does not duplicate an issuer already present in `VERIFIER_POLICY_TRUSTED_ISSUERS`.

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/server/shared/config/serverEnv.test.ts`

Expected: FAIL because the parsed trusted issuer list does not yet include the active issuer.

### Task 2: Implement the env merge

**Files:**
- Modify: `src/server/shared/config/serverEnv.ts`
- Test: `src/server/shared/config/serverEnv.test.ts`

**Step 1: Write minimal implementation**

Update verifier-policy env parsing to:
- trim and parse `VERIFIER_POLICY_TRUSTED_ISSUERS`
- read `ISSUER_DID`
- append the issuer when present
- deduplicate the final `trustedIssuers` array

**Step 2: Run test to verify it passes**

Run: `npx tsx --test src/server/shared/config/serverEnv.test.ts`

Expected: PASS

### Task 3: Update operator documentation

**Files:**
- Modify: `README.md`

**Step 1: Document the verifier policy env behavior**

Add a concise note under environment variables describing `VERIFIER_POLICY_TRUSTED_ISSUERS` and that delegated verifier policy checks should include the issuer DID used by this repo.

**Step 2: Verify docs remain aligned**

Run: `rg -n "VERIFIER_POLICY_TRUSTED_ISSUERS|ISSUER_DID" README.md src/server/shared/config/serverEnv.ts`

Expected: relevant env docs and parser logic match.

### Task 4: Focused verification

**Files:**
- Verify: `src/server/shared/config/serverEnv.ts`
- Verify: `src/server/shared/config/serverEnv.test.ts`
- Verify: `README.md`

**Step 1: Run focused tests**

Run: `npx tsx --test src/server/shared/config/serverEnv.test.ts`

Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS
