# Batch-Per-Contract Issuance Design

## Objective

Adjust the issuer architecture from single-credential anchoring to batch anchoring, where one issuance batch of students produces one shared Merkle tree, one shared Merkle root, and one distinct deployed smart contract for that batch.

For the current `main` branch UX, the active implementation target is a development-sized batch flow of `3-4` students, while the underlying architecture remains compatible with later expansion to larger batches.

## Scenario

The target issuance scenario is:

- `500` students
- each student has `2` credential components:
  - `diploma`
  - `transcript`
- total leaves in the batch Merkle tree: `1000`

The intended rule is:

```text
one issuance batch = one Merkle tree = one Merkle root = one deployed smart contract
```

Each student still receives an individual VC and an individual receipt/evidence package, but those `500` outputs all reference the same batch-level blockchain metadata.

## Problem

The current repository is still centered on a single-VC issuance path in `src/ui/App.tsx`, where the operator:

1. hashes the selected credential components,
2. builds one Merkle tree for that one credential,
3. anchors the root into an already deployed contract address,
4. signs and exports one VC.

The current smart contract in `src/contracts/solidity/AnchorRegistry.sol` also exposes a mutable `anchorRoot(bytes32)` entry point over a single `MTRoot` storage slot.

That creates two problems for the batch model:

- the active issuance path does not have a concept of one batch containing many students;
- reusing one long-lived contract across years or batches would overwrite `MTRoot`, which would make earlier batches disappear from the contract's current verifiable state.

## Goals

- model issuance around batches of students instead of one VC at a time;
- compute one Merkle tree over all student components in the batch;
- deploy one fresh contract for each issuance batch;
- keep the batch root stable for the life of that contract;
- generate one VC per student with only that student's component proofs;
- make every student VC from the same batch reference the same:
  - `chainId`
  - `contractAddress`
  - `merkleRoot`
  - anchor/deployment transaction metadata
- preserve verifier compatibility as much as possible.

## Non-Goals

- adding a database or durable batch persistence layer;
- redesigning OID4VCI pickup in the same change;
- redesigning revocation semantics beyond keeping them batch-scoped;
- introducing a full Solidity build toolchain into the repository if a checked-in artifact is sufficient.

## Approaches Considered

### 1. Fresh contract per batch with fixed root

For each issuance batch:

- compute the batch root,
- deploy a new contract,
- store the root only for that contract,
- issue all student VCs against that shared batch anchor.

Advantages:

- directly matches the business rule;
- older batches stay independently verifiable;
- student receipts remain small because they carry only student-specific proofs;
- revocation stays naturally scoped to the batch contract.

Disadvantages:

- every batch pays deployment cost;
- the active issuer path must gain explicit deployment support.

### 2. One registry contract storing many batch roots

A single contract stores many roots keyed by batch identifier instead of one mutable root.

Advantages:

- lower deployment overhead;
- old batches remain verifiable.

Disadvantages:

- violates the requested rule of one batch per deployed smart contract;
- requires a more invasive receipt and verifier redesign around `batchId`.

### 3. Reuse the current mutable-root contract

Advantages:

- smallest code delta.

Disadvantages:

- unacceptable, because later batches overwrite the current root and invalidate historical contract state for earlier receipts.

## Chosen Direction

Approach 1 is the correct architecture.

For this repository specifically, the recommended implementation variant is:

- deploy one new contract per batch;
- keep `anchorRoot(bytes32)` for now because the verifier already understands the `RootAnchored` event model;
- add an on-chain guard so `anchorRoot()` can be called only once per deployed contract.

This gives the repository the required batch isolation without forcing a full verifier redesign from event-based confirmation to constructor-only deployment confirmation in the same change.

The effective rule becomes:

```text
one contract instance anchors exactly one batch root, once
```

## Target Architecture

### 1. Batch issuance orchestration

Introduce a batch issuance layer above the existing component hashing and VC assembly helpers.

That layer should:

1. accept a batch of students and their components;
2. flatten all student components into one leaf list;
3. build one Merkle tree for the entire batch;
4. deploy a new batch contract;
5. call `anchorRoot()` exactly once for that contract;
6. fan back out into one VC and one receipt/evidence package per student.

### 2. Leaf identity model

Leaf names in the Merkle builder must be globally unique across the batch.

Using only `diploma` and `transcript` as leaf names is not sufficient, because proof lookup in `buildMerkle()` is keyed by leaf name.

The batch path should therefore use a student-scoped key, for example:

```text
student-123:diploma
student-123:transcript
```

The leaf content hash should still reflect the actual credential leaf encoding, but the Merkle proof map key must be unique per student component.

### 3. Contract model

The contract in `src/contracts/solidity/AnchorRegistry.sol` should remain batch-scoped but become one-time anchorable.

Required behavior:

- each deployed instance has one owner;
- `anchorRoot(bytes32)` succeeds only when no root has been anchored yet;
- any second call must revert;
- `verify()` and `isValid()` continue to operate on that batch's stored root and revocation data.

This preserves the current verifier's event-based confirmation path while eliminating accidental batch-root replacement inside one contract instance.

### 4. Student VC / receipt model

Each student VC should include only that student's component proofs, but the receipt should reference shared batch metadata.

Shared across all students in the batch:

- `chainId`
- `contractAddress`
- `merkleRoot`
- `anchorTx`
- optionally `deploymentTx`

Unique per student:

- student identifier
- student component hashes
- proofs for the student's `diploma`
- proofs for the student's `transcript`

### 5. Verifier impact

The existing verifier can remain mostly intact if the issued receipt still includes:

- `chainId`
- `contractAddress`
- `merkleRoot`
- `anchorTx`
- `componentsProofs`

The important architectural change is that the verifier must now treat the receipt contract as a batch-specific anchor rather than a globally reused contract.

### 6. Batch metadata

The issuance layer should also produce internal batch metadata for operator visibility and future automation:

- `batchId`
- `studentCount`
- `componentCount`
- `merkleRoot`
- `chainId`
- `contractAddress`
- `deploymentTx`
- `anchorTx`
- `issuedAt`

This metadata may stay internal at first and does not need to be fully embedded into the VC in phase 1.

## Data Flow

### Issue batch

1. Operator provides one batch of students.
2. The issuer normalizes the batch into `1000` component inputs.
3. The issuer hashes all components.
4. The issuer builds one Merkle tree over all component hashes.
5. The issuer deploys one new contract for this batch.
6. The issuer anchors the batch root once in that contract.
7. The issuer generates one VC per student.
8. The issuer attaches a receipt/evidence package to each VC containing only that student's proofs.

### Verify one student VC

1. The verifier loads one student VC.
2. The verifier reads the student's receipt.
3. The verifier recomputes that student's leaf hashes.
4. The verifier checks the student's proofs against the shared batch root.
5. The verifier checks the batch contract anchored that root.
6. The verifier checks the batch contract revocation state for the student's revocation key.

## Error Handling

The batch issuance path should fail the entire batch when:

- any student is missing a required component;
- any student/component leaf key is duplicated;
- hashing fails for any component;
- the Merkle tree cannot be built;
- contract deployment fails;
- one-time anchoring fails;
- proof extraction cannot find a proof for any student component.

This batch should not partially issue student VCs if anchoring failed.

## Testing Strategy

Implementation should cover four levels:

1. batch aggregation:
   - all student components are flattened correctly;
   - leaf keys are unique;
   - the expected leaf count is produced.
2. proof fan-out:
   - all students from one batch share the same root;
   - each student receives only their own proofs.
3. contract semantics:
   - `anchorRoot()` succeeds once and rejects a second call;
   - independent contracts preserve independent batch state.
4. end-to-end issuance assembly:
   - one batch produces many VCs;
   - all VCs share the same batch blockchain metadata;
   - verification still succeeds using the issued receipts.

## Decision

Proceed with a batch-oriented issuer architecture where:

- one issuance batch deploys one fresh contract;
- that contract anchors one root once;
- all student VCs in the batch share the same contract and root;
- each student VC carries only student-specific proofs against that shared batch root.
