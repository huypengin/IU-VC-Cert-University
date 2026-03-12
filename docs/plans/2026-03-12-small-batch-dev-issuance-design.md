# Small-Batch Dev Issuance Design

## Objective

Adjust the current `main` branch issuance flow so it behaves like a small development batch issuer instead of implying immediate support for very large batches.

The target behavior on `main` is:

- default issuance batch size: `3` students
- allowed development batch size in the UI: `3-4` students
- each student has exactly `2` components:
  - `diploma`
  - `transcript`
- total leaves per UI issuance batch: `6-8`

The batch architecture remains unchanged:

```text
one issuance batch = one Merkle tree = one Merkle root = one deployed smart contract
```

## Problem

The repository now has a batch-per-contract core direction, but the current UI and docs still risk communicating the wrong expectation:

- the business scenario can eventually scale to many students and many leaves;
- the development branch does not need to issue a large batch today;
- the current issuer UI should be optimized for small, repeatable development runs;
- the present wording can make it sound like the active issue flow is intended to issue hundreds of students immediately.

That mismatch creates two risks:

- the implementation becomes harder than needed for current development;
- the documentation overstates what the current `main` UX is meant to handle.

## Goals

- keep the batch-per-contract architecture already chosen;
- make the `main` issue flow explicitly a small-batch development flow;
- default the issue UI to `3` students;
- allow the operator to adjust the current dev batch between `3` and `4` students;
- keep exactly `2` components per student in this phase:
  - `diploma`
  - `transcript`
- issue one VC per student while sharing one batch contract and one batch root;
- update docs so they describe the current development scope accurately.

## Non-Goals

- adding full large-batch UX for `500` students on `main`;
- hard-limiting the core orchestration layer to only `3-4` students forever;
- adding CSV upload, persistent batch storage, or background processing;
- redesigning verifier semantics or revocation behavior.

## Approaches Considered

### 1. Recommended: small-batch UI, scalable core

Keep the new batch issuance architecture in the core layer, but make the current React issue screen a development-oriented small-batch interface.

Advantages:

- matches current development needs;
- avoids baking a temporary UI constraint into long-term core logic;
- preserves future expansion to larger batches;
- keeps the architecture direction coherent.

Disadvantages:

- the UI still needs another redesign later for real bulk issuance.

### 2. Hard-limit both UI and core to four students

Advantages:

- strongest guardrail against accidental large runs during development.

Disadvantages:

- mixes a temporary demo constraint into business logic;
- creates future removal work in the core layer.

### 3. Revert `main` back to one-student issuance

Advantages:

- smallest UI surface.

Disadvantages:

- breaks the newly chosen batch-per-contract direction;
- would require redoing the flow again later.

## Chosen Direction

Approach 1 is the correct fit.

The issuer should keep its batch-oriented core logic, but the UI on `main` should be explicit that it is a development-sized batch issuer for `3-4` students.

This means:

- the core may still support larger inputs later;
- the current browser issue workflow should default to a small batch and present that clearly;
- the documentation should stop implying that the current `main` UI is intended for immediate large-batch operation.

## Target Behavior

### 1. Issue UI

The issue screen should:

- start with `3` students by default;
- allow the operator to add or remove students within the range `3-4`;
- pre-fill each student with:
  - one `diploma` component
  - one `transcript` component
- show that the issue action is creating a small batch, not a single VC and not a massive production batch.

### 2. Batch assembly

On each issuance action:

1. the UI collects `3-4` students;
2. the core flattens them into `6-8` component leaves;
3. the issuer builds one Merkle tree;
4. the issuer deploys one fresh contract for that batch;
5. the issuer anchors the root once;
6. the issuer generates one VC per student.

### 3. Output behavior

All student VCs from the same UI issuance run should share:

- `chainId`
- `contractAddress`
- `merkleRoot`
- `deploymentTx`
- `anchorTx`

Each student VC should differ only in:

- student identity
- student component hashes
- student-specific proofs

### 4. Scope statement

The documentation should explicitly state:

- the current `main` issue flow is a small-batch development issuer;
- larger batches remain a later capability;
- the underlying architecture is already batch-based and does not need to be discarded.

## Error Handling

The UI should fail clearly when:

- fewer than `3` students are present;
- more than `4` students are added in the current dev flow;
- a student is missing `diploma` or `transcript`;
- issuance fails during deployment or anchoring;
- any student VC cannot be assembled from the shared batch result.

## Testing Strategy

Implementation should add tests for:

1. default small-batch state in the UI;
2. enforcement of `3-4` students in the current dev flow;
3. `6-8` component expectation from `3-4` students with two components each;
4. shared batch metadata across all issued student VCs;
5. updated UI formatting and messaging for batch results.

## Decision

Proceed with a development-focused small-batch issuer on `main` where:

- the UI defaults to `3` students;
- the current UI allows only `3-4` students;
- each student contributes `diploma` and `transcript`;
- one issuance action still creates one root and one contract for the whole batch;
- larger batches are intentionally deferred to a later UI expansion.
