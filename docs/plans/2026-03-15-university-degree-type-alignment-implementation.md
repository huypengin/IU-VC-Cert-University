# University Degree Type Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align issued credential types, OID4VCI metadata, and local examples/tests with the registry's canonical degree type contract.

**Architecture:** Keep one canonical SmartCert type list in the issuance and wallet metadata paths. Update the tests first so the repo proves the new type contract before code changes, then patch the smallest set of production files and local fixtures that still use the older degree typing.

**Tech Stack:** TypeScript, node:test via `tsx --test`, React/Vite repo structure, existing OID4VCI controller/service tests

---

### Task 1: Lock the new SmartCert type contract with failing tests

**Files:**
- Modify: `src/vc/assembleBatchVc.test.ts`
- Modify: `src/oid4vci/issuerMetadata.test.ts`

**Step 1: Write the failing tests**

- Extend the VC assembly test to assert the full issued SmartCert type array:
  - `VerifiableCredential`
  - `UniversityDegree`
  - `EducationalOccupationalCredential`
  - `VNEduDegreeCredential`
  - `IUSmartCertCredential`
- Extend issuer metadata assertions so both Draft 13 and Draft 11 metadata expose the same canonical SmartCert type list.

**Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/vc/assembleBatchVc.test.ts src/oid4vci/issuerMetadata.test.ts`

Expected: FAIL because production code still advertises the older type arrays.

**Step 3: Write minimal implementation**

- Update the canonical type arrays in:
  - `src/vc/assembleVc.ts`
  - `src/oid4vci/oid4vci.controller.ts`

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/vc/assembleBatchVc.test.ts src/oid4vci/issuerMetadata.test.ts`

Expected: PASS

### Task 2: Align repo fixtures and dependent tests with the same contract

**Files:**
- Modify: `src/oid4vci/jwtSigningAlg.test.ts`
- Modify: `src/oid4vci/uploadedVcPickup.test.ts`
- Modify: `src/schemas/1.0/schema/schema-unidegree.json`
- Modify: `src/schemas/1.1/schema/schema-iu-cert.json`
- Modify: `src/schemas/__generated__/VC_document.example.ts`
- Modify: `src/schemas/__generated__/schema.example.ts`

**Step 1: Write the failing assertions or fixture updates**

- Update hardcoded uploaded VC test fixtures so they represent the canonical type contract.
- Update local schema/example files that still encode the older degree type sets.

**Step 2: Run focused verification**

Run: `npx tsx --test src/oid4vci/jwtSigningAlg.test.ts src/oid4vci/uploadedVcPickup.test.ts`

Expected: PASS after fixture alignment, with no drift against the new production type list.

**Step 3: Run broader verification**

Run: `npx tsx --test src/vc/assembleBatchVc.test.ts src/oid4vci/issuerMetadata.test.ts src/oid4vci/jwtSigningAlg.test.ts src/oid4vci/uploadedVcPickup.test.ts`

Expected: PASS
