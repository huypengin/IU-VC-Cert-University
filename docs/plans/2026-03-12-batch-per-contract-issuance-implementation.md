# Batch-Per-Contract Issuance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current single-credential anchoring path with batch issuance that builds one Merkle tree across all student components, deploys one fresh contract per batch, anchors the root once, and emits one VC plus one student-specific receipt package per student.

**Architecture:** Add a batch issuance orchestration layer that flattens students into unique component leaves, reuses the existing hashing and Merkle helpers, deploys a fresh contract for each batch, and then fans proofs back out into per-student VC receipts. Keep the current verifier-compatible `RootAnchored` event model, but enforce one-time anchoring per contract so a batch root cannot be replaced later.

**Tech Stack:** TypeScript, React 19, ethers v6, node:test via `tsx --test`, existing IU-SmartCert VC and verifier helpers

---

### Task 1: Add batch leaf aggregation and proof fan-out helpers

**Files:**
- Create: `src/core/issuance/batch.ts`
- Create: `src/core/issuance/batch.test.ts`
- Modify: `src/core/index.ts`
- Reference: `src/core/hashing/hashComponents.ts`
- Reference: `src/core/merkle/merkle.ts`

**Step 1: Write the failing test**

Create `src/core/issuance/batch.test.ts` with tests for:

```ts
test("buildBatchMerkle groups many students into one root and returns student-scoped proofs", () => {
  const result = buildBatchMerkle({
    students: [
      {
        studentId: "student-001",
        credentialId: "urn:uuid:001",
        components: [
          { name: "diploma", mandatory: true, componentType: "degreeCertificate", content: "diploma-001" },
          { name: "transcript", mandatory: false, componentType: "academicTranscript", content: "transcript-001" },
        ],
      },
      {
        studentId: "student-002",
        credentialId: "urn:uuid:002",
        components: [
          { name: "diploma", mandatory: true, componentType: "degreeCertificate", content: "diploma-002" },
          { name: "transcript", mandatory: false, componentType: "academicTranscript", content: "transcript-002" },
        ],
      },
    ],
  });

  assert.equal(result.batch.componentCount, 4);
  assert.equal(result.students.length, 2);
  assert.equal(result.students[0].receiptComponents.length, 2);
  assert.equal(result.students[0].merkleRoot, result.students[1].merkleRoot);
});

test("buildBatchMerkle rejects duplicate student-scoped leaf keys", () => {
  assert.throws(() => buildBatchMerkle({
    students: [
      {
        studentId: "student-001",
        credentialId: "urn:uuid:001",
        components: [
          { name: "diploma", mandatory: true, componentType: "degreeCertificate", content: "v1" },
          { name: "diploma", mandatory: false, componentType: "degreeCertificate", content: "v2" },
        ],
      },
    ],
  }), /duplicate/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/core/issuance/batch.test.ts
```

Expected: FAIL because the batch issuance helper does not exist yet.

**Step 3: Write minimal implementation**

Create `src/core/issuance/batch.ts` with:

- a `BatchStudentInput` type
- a `buildBatchMerkle()` helper that:
  - hashes components per student using `hashComponents()`
  - creates unique leaf keys such as `studentId:name`
  - builds one shared Merkle tree with `buildMerkle()`
  - returns batch-level metadata plus per-student receipt-ready proof entries

Export the new helper from `src/core/index.ts`.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/core/issuance/batch.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/issuance/batch.ts src/core/issuance/batch.test.ts src/core/index.ts
git commit -m "feat: add batch merkle issuance helpers"
```

### Task 2: Extend VC receipt assembly for shared batch metadata and student-specific proofs

**Files:**
- Modify: `src/vc/types.ts`
- Modify: `src/vc/assembleVc.ts`
- Create: `src/vc/assembleBatchVc.test.ts`
- Reference: `src/core/issuance/batch.ts`

**Step 1: Write the failing test**

Create `src/vc/assembleBatchVc.test.ts` with tests for:

```ts
test("assembleVc keeps shared batch metadata while embedding only one student's proofs", () => {
  const vc = assembleVc({
    credentialId: "urn:uuid:001",
    validFrom: "2026-03-12T00:00:00Z",
    subjectDid: "did:example:student-001",
    degree: { type: "BachelorDegree", name: "BSc" },
    components: [
      { name: "diploma", mandatory: true, componentType: "degreeCertificate", componentHash: "0x" + "11".repeat(32) },
      { name: "transcript", mandatory: false, componentType: "academicTranscript", componentHash: "0x" + "22".repeat(32) },
    ],
    merkle: {
      chainId: "eip155:11155111",
      contractAddress: "0x1234567890123456789012345678901234567890",
      merkleRoot: "0x" + "aa".repeat(32),
      anchorTx: "0x" + "bb".repeat(32),
      deploymentTx: "0x" + "cc".repeat(32),
      proofs: {
        diploma: ["0x" + "33".repeat(32)],
        transcript: ["0x" + "44".repeat(32)],
      },
    },
  });

  const receipt = vc["iu:merkleReceipt"];
  assert.equal(receipt?.merkleRoot, "0x" + "aa".repeat(32));
  assert.equal(receipt?.componentsProofs.length, 2);
  assert.equal(receipt?.deploymentTx, "0x" + "cc".repeat(32));
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/vc/assembleBatchVc.test.ts
```

Expected: FAIL because the receipt type does not yet support the batch deployment metadata required by the new flow.

**Step 3: Write minimal implementation**

Update `src/vc/types.ts` to:

- add optional `deploymentTx?: string` to `IUSmartCertMerkleReceipt`
- keep `anchorTx` for verifier compatibility

Update `src/vc/assembleVc.ts` to pass through `deploymentTx` when present.

Do not expand scope into unrelated receipt redesign; keep the existing evidence layout stable.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/vc/assembleBatchVc.test.ts
```

Expected: PASS

**Step 5: Run regression tests**

Run:

```bash
npx tsx --test src/vc/assembleBatchVc.test.ts src/revocation/key.test.ts src/verifier/revocation.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/vc/types.ts src/vc/assembleVc.ts src/vc/assembleBatchVc.test.ts
git commit -m "feat: extend receipts with batch deployment metadata"
```

### Task 3: Make the batch contract one-time anchorable and add deployment support

**Files:**
- Modify: `src/contracts/solidity/AnchorRegistry.sol`
- Create: `src/contracts/abi/AnchorRegistryBatch.json`
- Create: `src/core/chain/deployBatchContract.ts`
- Create: `src/core/chain/deployBatchContract.test.ts`
- Modify: `src/core/index.ts`
- Reference: `src/core/chain/registry.ts`
- Reference: `src/legacy/iu-smartcert-dapp/src/constants.tsx`

**Step 1: Write the failing test**

Create `src/core/chain/deployBatchContract.test.ts` with tests for:

```ts
test("deployBatchContract returns deployment metadata for a new contract instance", async () => {
  const result = await deployBatchContract({
    chainId: "eip155:11155111",
    rpcUrl: "",
    merkleRoot: "0x" + "aa".repeat(32),
  }, {
    injected: fakeInjectedProvider,
    artifact: {
      abi: [{ type: "function", name: "anchorRoot", inputs: [{ name: "merkleRoot", type: "bytes32" }], outputs: [], stateMutability: "nonpayable" }],
      bytecode: "0x6000",
    },
  });

  assert.equal(result.chainId, "eip155:11155111");
  assert.match(result.contractAddress, /^0x/i);
});

test("anchorBatchRoot rejects when called a second time against the same contract", async () => {
  await assert.rejects(() => anchorBatchRootOnce({
    chainId: "eip155:11155111",
    rpcUrl: "",
    contractAddress: "0x1234567890123456789012345678901234567890",
    merkleRoot: "0x" + "aa".repeat(32),
  }, fakeAlreadyAnchoredContext), /already anchored/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/core/chain/deployBatchContract.test.ts
```

Expected: FAIL because no batch deployment helper or one-time anchor helper exists yet.

**Step 3: Write minimal implementation**

Update `src/contracts/solidity/AnchorRegistry.sol` so:

- `anchorRoot(bytes32)` reverts when `MTRoot` is already set
- the `RootAnchored` event remains unchanged

Create `src/contracts/abi/AnchorRegistryBatch.json` containing:

- the ABI needed by the browser deployment path
- checked-in bytecode compiled from the updated Solidity contract

Create `src/core/chain/deployBatchContract.ts` with:

- `deployBatchContract()` for MetaMask-based deployment using the checked-in artifact
- `anchorBatchRootOnce()` for the one-time root anchor transaction

Export the helpers from `src/core/index.ts`.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/core/chain/deployBatchContract.test.ts
```

Expected: PASS

**Step 5: Manual verification**

Because the repository does not have a Solidity compile pipeline, verify the checked-in artifact manually:

- compile `src/contracts/solidity/AnchorRegistry.sol` externally
- confirm the ABI matches `src/contracts/abi/AnchorRegistryBatch.json`
- confirm the bytecode in the artifact was generated from the guarded one-time-anchor contract

**Step 6: Commit**

```bash
git add src/contracts/solidity/AnchorRegistry.sol src/contracts/abi/AnchorRegistryBatch.json src/core/chain/deployBatchContract.ts src/core/chain/deployBatchContract.test.ts src/core/index.ts
git commit -m "feat: add one-time batch contract deployment flow"
```

### Task 4: Add a batch issuer orchestration path that produces one VC per student

**Files:**
- Create: `src/core/issuance/issueBatch.ts`
- Create: `src/core/issuance/issueBatch.test.ts`
- Modify: `src/core/index.ts`
- Reference: `src/core/issuance/batch.ts`
- Reference: `src/core/chain/deployBatchContract.ts`
- Reference: `src/vc/assembleVc.ts`
- Reference: `src/vc/signVc.ts`

**Step 1: Write the failing test**

Create `src/core/issuance/issueBatch.test.ts` with tests for:

```ts
test("issueBatch deploys once, anchors once, and returns one VC result per student", async () => {
  const result = await issueBatch({
    chainId: "eip155:11155111",
    rpcUrl: "",
    students: [
      {
        studentId: "student-001",
        subjectDid: "did:example:student-001",
        credentialId: "urn:uuid:001",
        degree: { type: "BachelorDegree", name: "BSc" },
        components: [
          { name: "diploma", mandatory: true, componentType: "degreeCertificate", content: "diploma-001" },
          { name: "transcript", mandatory: false, componentType: "academicTranscript", content: "transcript-001" },
        ],
      },
      {
        studentId: "student-002",
        subjectDid: "did:example:student-002",
        credentialId: "urn:uuid:002",
        degree: { type: "BachelorDegree", name: "BSc" },
        components: [
          { name: "diploma", mandatory: true, componentType: "degreeCertificate", content: "diploma-002" },
          { name: "transcript", mandatory: false, componentType: "academicTranscript", content: "transcript-002" },
        ],
      },
    ],
  }, fakeDependencies);

  assert.equal(result.batch.componentCount, 4);
  assert.equal(result.students.length, 2);
  assert.equal(result.students[0].vc["iu:merkleReceipt"]?.contractAddress, result.students[1].vc["iu:merkleReceipt"]?.contractAddress);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/core/issuance/issueBatch.test.ts
```

Expected: FAIL because no batch orchestration entry point exists yet.

**Step 3: Write minimal implementation**

Create `src/core/issuance/issueBatch.ts` that:

- builds the batch Merkle data once
- deploys the contract once
- anchors the root once
- assembles one VC per student
- signs each VC
- returns:
  - batch metadata
  - one output record per student containing signed VC and receipt data

Inject deployment and signing dependencies so the orchestration can be unit-tested without real chain or key access.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/core/issuance/issueBatch.test.ts
```

Expected: PASS

**Step 5: Run regression tests**

Run:

```bash
npx tsx --test src/core/issuance/batch.test.ts src/core/issuance/issueBatch.test.ts src/vc/assembleBatchVc.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/core/issuance/issueBatch.ts src/core/issuance/issueBatch.test.ts src/core/index.ts
git commit -m "feat: add batch student issuance orchestration"
```

### Task 5: Adapt the issuer UI and verifier assumptions to batch-scoped contracts

**Files:**
- Modify: `src/ui/App.tsx`
- Create: `src/ui/batchIssuance.test.ts`
- Modify: `src/verifier/chainVerification.ts`
- Modify: `docs/issuer-architecture.md`
- Modify: `README.md`

**Step 1: Write the failing test**

Create `src/ui/batchIssuance.test.ts` with tests for:

```ts
test("batch issuance output shares one contract across all student VCs", async () => {
  const result = await formatBatchIssuanceForUi(fakeBatchResult);
  assert.equal(result.students[0].contractAddress, result.students[1].contractAddress);
});

test("verifyChainAnchoring still accepts batch-scoped receipts that share one anchorTx", async () => {
  const receipt = fakeBatchStudentReceipt();
  const result = await verifyChainAnchoring(receipt, "http://localhost:8545");
  assert.equal(typeof result.valid, "boolean");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/ui/batchIssuance.test.ts
```

Expected: FAIL because the UI still assumes one manual contract address input and one VC issuance action.

**Step 3: Write minimal implementation**

Update `src/ui/App.tsx` so the issue path can consume a batch result instead of only a single VC flow.

Keep scope narrow:

- remove the assumption that the operator supplies one preexisting contract address for issuance;
- surface returned batch metadata and student outputs;
- preserve verification and revocation behavior against the receipt's own `contractAddress`.

Update `src/verifier/chainVerification.ts` only as needed to keep batch receipts readable; avoid a broad verifier rewrite.

Update `README.md` and `docs/issuer-architecture.md` to describe:

- one batch = one Merkle root = one fresh contract
- one-time anchoring per contract
- shared batch metadata across student receipts

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/ui/batchIssuance.test.ts
```

Expected: PASS

**Step 5: Run focused verification**

Run:

```bash
npx tsx --test src/verifier/revocation.test.ts src/ui/batchIssuance.test.ts
npm run typecheck
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/ui/App.tsx src/ui/batchIssuance.test.ts src/verifier/chainVerification.ts README.md docs/issuer-architecture.md
git commit -m "feat: adapt issuer ui to batch-scoped contract issuance"
```
