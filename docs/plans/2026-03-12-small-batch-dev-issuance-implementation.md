# Small-Batch Dev Issuance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adjust `main` so the current issuer UX behaves as a small-batch development flow that issues `3-4` students per batch, while preserving the underlying batch-per-contract architecture for future scaling.

**Architecture:** Keep the batch-capable core orchestration intact and constrain the current React issue flow to a development-sized batch model. The UI should default to `3` students, each with `diploma` and `transcript`, and then call the existing batch issuance path to produce one root, one fresh contract, and one VC per student.

**Tech Stack:** React 19, TypeScript, ethers v6, node:test via `tsx --test`, existing IU-SmartCert core/vc/verifier helpers

---

### Task 1: Add small-batch UI state helpers for `3-4` students

**Files:**
- Create: `src/ui/issueBatchState.ts`
- Create: `src/ui/issueBatchState.test.ts`
- Reference: `src/ui/App.tsx`

**Step 1: Write the failing test**

Create `src/ui/issueBatchState.test.ts` with tests for:

```ts
test("createDefaultIssueBatchState returns 3 students with diploma and transcript components", () => {
  const state = createDefaultIssueBatchState();
  assert.equal(state.students.length, 3);
  assert.deepEqual(state.students.map((s) => s.components.map((c) => c.name)), [
    ["diploma", "transcript"],
    ["diploma", "transcript"],
    ["diploma", "transcript"],
  ]);
});

test("addStudentToIssueBatchState rejects when adding a fifth student", () => {
  const state = createDefaultIssueBatchState();
  const withFourth = addStudentToIssueBatchState(state);
  assert.equal(withFourth.students.length, 4);
  assert.throws(() => addStudentToIssueBatchState(withFourth), /3-4 students/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/ui/issueBatchState.test.ts
```

Expected: FAIL because the small-batch state helpers do not exist yet.

**Step 3: Write minimal implementation**

Create `src/ui/issueBatchState.ts` with:

- `createDefaultIssueBatchState()`
- `addStudentToIssueBatchState()`
- `removeStudentFromIssueBatchState()`

Rules:

- default student count is `3`
- maximum is `4`
- minimum is `3`
- each student starts with exactly:
  - `diploma`
  - `transcript`

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/ui/issueBatchState.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/issueBatchState.ts src/ui/issueBatchState.test.ts
git commit -m "feat: add small batch issue state helpers"
```

### Task 2: Adapt the issue UI from one-student form to a `3-4` student dev batch form

**Files:**
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/batchIssuance.ts`
- Create: `src/ui/batchIssuance.test.ts`
- Reference: `src/ui/issueBatchState.ts`
- Reference: `src/core/issuance/issueBatch.ts`

**Step 1: Write the failing test**

Add or update `src/ui/batchIssuance.test.ts` with tests for:

```ts
test("formatBatchIssuance summarizes a 3-student dev batch", () => {
  const summary = formatBatchIssuance({
    batch: {
      chainId: "eip155:11155111",
      contractAddress: "0x1234567890123456789012345678901234567890",
      deploymentTx: "0xdeploy",
      anchorTx: "0xanchor",
      merkleRoot: "0x" + "aa".repeat(32),
      studentCount: 3,
      componentCount: 6,
    },
    students: [/* 3 results */],
  });

  assert.equal(summary.studentCount, 3);
  assert.equal(summary.componentCount, 6);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/ui/batchIssuance.test.ts
```

Expected: FAIL because the UI formatter or assumptions still reflect the old single-student demo shape.

**Step 3: Write minimal implementation**

Update `src/ui/App.tsx` so the issue tab:

- manages a `students` array instead of one student form;
- renders `3` students by default;
- allows add/remove only within `3-4`;
- submits all students to `issueBatch()`;
- shows one batch summary and one VC output per student;
- uses explicit copy such as `Issue Small Batch`.

Do not add CSV import, persistence, or generic large-batch tooling.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/ui/batchIssuance.test.ts
```

Expected: PASS

**Step 5: Run focused verification**

Run:

```bash
npx tsx --test src/ui/issueBatchState.test.ts src/ui/batchIssuance.test.ts src/core/issuance/issueBatch.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/ui/App.tsx src/ui/batchIssuance.ts src/ui/batchIssuance.test.ts src/ui/issueBatchState.ts src/ui/issueBatchState.test.ts
git commit -m "feat: switch issuer ui to small batch dev flow"
```

### Task 3: Add validation for `3-4` students and `6-8` components in the dev issue flow

**Files:**
- Modify: `src/core/issuance/issueBatch.ts`
- Create: `src/core/issuance/issueBatchDevLimits.test.ts`
- Reference: `src/core/issuance/issueBatch.test.ts`

**Step 1: Write the failing test**

Create `src/core/issuance/issueBatchDevLimits.test.ts` with tests for:

```ts
test("issueBatch rejects fewer than 3 students when dev batch validation is enabled", async () => {
  await assert.rejects(() =>
    issueBatch({
      chainId: "eip155:11155111",
      rpcUrl: "",
      validFrom: "2026-03-12T00:00:00Z",
      students: [/* 2 students */],
      devBatchLimits: true,
    }, fakeDeps),
    /3-4 students/i,
  );
});

test("issueBatch rejects more than 8 components when dev batch validation is enabled", async () => {
  await assert.rejects(() =>
    issueBatch({
      chainId: "eip155:11155111",
      rpcUrl: "",
      validFrom: "2026-03-12T00:00:00Z",
      students: [/* 4 students with 3 components each */],
      devBatchLimits: true,
    }, fakeDeps),
    /6-8 components/i,
  );
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/core/issuance/issueBatchDevLimits.test.ts
```

Expected: FAIL because the orchestrator does not yet enforce the development-size guardrails.

**Step 3: Write minimal implementation**

Update `src/core/issuance/issueBatch.ts` to support an explicit development validation mode used by the current UI.

Rules in that mode:

- student count must be between `3` and `4`
- total component count must be between `6` and `8`
- current UI path should enable that mode

Keep the default core path extensible so future large-batch UI work can disable the dev-only guard.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/core/issuance/issueBatchDevLimits.test.ts
```

Expected: PASS

**Step 5: Run regression tests**

Run:

```bash
npx tsx --test src/core/issuance/batch.test.ts src/core/issuance/issueBatch.test.ts src/core/issuance/issueBatchDevLimits.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/core/issuance/issueBatch.ts src/core/issuance/issueBatchDevLimits.test.ts
git commit -m "feat: enforce small batch dev limits in issue flow"
```

### Task 4: Update docs to describe the current `main` flow accurately

**Files:**
- Modify: `README.md`
- Modify: `docs/issuer-architecture.md`
- Modify: `docs/plans/2026-03-12-batch-per-contract-issuance-design.md`

**Step 1: Write the failing test**

This task is documentation-only. Instead of a code test, define the required doc checks:

- `README.md` states the current issue UI is a small-batch development flow
- `README.md` no longer implies current `main` is aimed at immediate 500-student UI issuance
- `docs/issuer-architecture.md` distinguishes the current small-batch UI from future larger-batch scaling

**Step 2: Verify current docs are outdated**

Run:

```bash
rg -n "500|one-student demo|small-batch|3-4 students|fresh contract per batch" README.md docs/issuer-architecture.md docs/plans/2026-03-12-batch-per-contract-issuance-design.md
```

Expected: current wording is incomplete or misleading for the approved dev scope.

**Step 3: Write minimal implementation**

Update the docs so they say:

- current `main` issue UI is a development-sized batch issuer for `3-4` students;
- each student contributes `diploma` and `transcript`;
- the core architecture still uses one root and one contract per batch;
- larger batch support is a later expansion.

**Step 4: Verify docs**

Run:

```bash
rg -n "small-batch|3-4 students|diploma|transcript|one root and one contract per batch" README.md docs/issuer-architecture.md docs/plans/2026-03-12-batch-per-contract-issuance-design.md
```

Expected: the updated wording appears in the target docs.

**Step 5: Commit**

```bash
git add README.md docs/issuer-architecture.md docs/plans/2026-03-12-batch-per-contract-issuance-design.md
git commit -m "docs: describe small batch dev issuance scope"
```
