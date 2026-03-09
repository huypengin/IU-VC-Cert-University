# Smart-Contract Revocation Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the first complete IU-specific revocation flow on `main`, where the issuer wallet revokes a VC on-chain through MetaMask and the custom verifier treats that VC as invalid.

**Architecture:** Keep the current issuance and Merkle anchoring model unchanged. Add one deterministic revocation-key extraction helper, extend chain verification to query the existing smart contract revocation list, and add a narrow UI revoke action that submits `revokeCertificate(bytes32,string)` using the same MetaMask owner wallet already used for anchoring.

**Tech Stack:** React 19, TypeScript, ethers v6, MetaMask/EIP-1193 provider, node:test via `tsx --test`

---

### Task 1: Add a deterministic revocation-key helper

**Files:**
- Create: `src/revocation/key.ts`
- Create: `src/revocation/key.test.ts`
- Reference: `src/verifier/receiptResolver.ts`
- Reference: `src/vc/types.ts`

**Step 1: Write the failing test**

Create `src/revocation/key.test.ts` with tests for:

```ts
test("getRevocationKeyFromReceipt returns the first mandatory component hash", () => {
  const receipt = {
    componentsProofs: [
      { name: "transcript", mandatory: false, hash: "0x02", proof: [] },
      { name: "diploma", mandatory: true, hash: "0x11", proof: [] },
      { name: "thesis", mandatory: true, hash: "0x22", proof: [] },
    ],
  } as any;

  assert.equal(getRevocationKeyFromReceipt(receipt), "0x11");
});

test("getRevocationKeyFromReceipt throws when no mandatory component exists", () => {
  assert.throws(
    () => getRevocationKeyFromReceipt({ componentsProofs: [{ mandatory: false, hash: "0x02", proof: [] }] } as any),
    /mandatory component/i,
  );
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/revocation/key.test.ts
```

Expected: FAIL because `src/revocation/key.ts` does not exist yet.

**Step 3: Write minimal implementation**

Create `src/revocation/key.ts` exporting:

- `getRevocationKeyFromReceipt(receipt)`
- `getRevocationKeyFromVc(vc)` that reuses `resolveReceipt(vc)` and then calls `getRevocationKeyFromReceipt`

Minimal shape:

```ts
export function getRevocationKeyFromReceipt(receipt: IUSmartCertMerkleReceipt): string {
  const mandatory = receipt.componentsProofs.find((component) => component.mandatory);
  if (!mandatory?.hash) {
    throw new Error("No mandatory component hash found for revocation");
  }
  return mandatory.hash;
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/revocation/key.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/revocation/key.ts src/revocation/key.test.ts
git commit -m "feat: add smart-contract revocation key helper"
```

### Task 2: Extend chain verification to enforce revocation

**Files:**
- Modify: `src/verifier/types.ts`
- Modify: `src/verifier/chainVerification.ts`
- Modify: `src/verifier/index.ts`
- Create: `src/verifier/revocation.test.ts`
- Reference: `src/revocation/key.ts`
- Reference: `src/contracts/solidity/AnchorRegistry.sol`

**Step 1: Write the failing test**

Create `src/verifier/revocation.test.ts` covering:

```ts
test("verifyVC returns invalid when the contract revocation list marks the VC revoked", async () => {
  // mock the receipt resolution + chain read path
  // expect result.valid === false
  // expect result.chain?.revoked === true
  // expect result.chain?.revocationReason === "issuer revoked"
});

test("verifyVC stays valid when the contract reports not revoked", async () => {
  // same structure, but contract read returns [true, "valid"]
  // expect result.valid === true
});
```

Use module seams that are easy to mock. If direct mocking of `ethers.Contract` is awkward, first extract a small helper in `chainVerification.ts` such as:

- `checkContractRevocation(receipt, provider)`
- or `readRevocationStatus(contract, revocationKey)`

and test that helper plus one integration-style `verifyVC` case.

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/verifier/revocation.test.ts
```

Expected: FAIL because revocation is not yet part of verifier results.

**Step 3: Write minimal implementation**

Update `src/verifier/types.ts` so `ChainVerificationResult` includes:

- `revoked?: boolean`
- `revocationReason?: string`
- `revocationKey?: string`

Update `src/verifier/chainVerification.ts` to:

1. derive the revocation key from the receipt using `getRevocationKeyFromReceipt`
2. call `isValid(revocationKey)` on the existing contract
3. return `valid: false` plus the revoke reason when the contract reports revoked

Minimal contract call shape:

```ts
const [isValidResult, reason] = await contract.isValid(hashToBytes32(revocationKey));
if (!isValidResult) {
  return {
    valid: false,
    anchorTxConfirmed: true,
    chainId,
    contractAddress,
    revoked: true,
    revocationReason: reason,
    revocationKey,
    error: `Credential revoked on-chain: ${reason}`,
  };
}
```

Update `src/verifier/index.ts` so a revoked chain result is terminal and the overall `VerificationResult.valid` becomes `false`.

**Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test src/verifier/revocation.test.ts
```

Expected: PASS

**Step 5: Run regression tests**

Run:

```bash
npx tsx --test src/verifier/revocation.test.ts src/vc/registryUrl.test.ts src/ui/pickupState.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/verifier/types.ts src/verifier/chainVerification.ts src/verifier/index.ts src/verifier/revocation.test.ts src/revocation/key.ts
git commit -m "feat: enforce smart-contract revocation in verifier"
```

### Task 3: Add MetaMask revoke action to the issuer UI

**Files:**
- Create: `src/core/chain/revocation.ts`
- Create: `src/core/chain/revocation.test.ts`
- Modify: `src/core/index.ts`
- Modify: `src/ui/App.tsx`
- Reference: `src/core/chain/registry.ts`
- Reference: `src/revocation/key.ts`

**Step 1: Write the failing test**

Create `src/core/chain/revocation.test.ts` for the narrow transaction helper:

```ts
test("revokeOnChain calls revokeCertificate with the revocation key and reason", async () => {
  // inject a fake EIP-1193 provider and fake contract
  // expect contract.revokeCertificate("0x...", "issuer revoked")
});

test("revokeOnChain fails on chainId mismatch", async () => {
  // expect chain mismatch error
});
```

Prefer the same style as `anchorRoot`: small helper, dependency-light, EIP-1193 + ethers v6.

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/core/chain/revocation.test.ts
```

Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

Create `src/core/chain/revocation.ts` exporting:

- `revokeCredentialOnChain({ chainId, contractAddress, revocationKey, reason })`

Implementation should mirror `anchorRoot`:

1. require MetaMask
2. request accounts
3. check `chainId`
4. get signer
5. instantiate the same contract ABI
6. call `revokeCertificate(bytes32,string)`
7. return `{ revokeTx, chainId, contractAddress, revocationKey, reason }`

Then export it from `src/core/index.ts`.

**Step 4: Wire the UI**

Update `src/ui/App.tsx` to add a small revoke section in the Verify tab or a separate card. Keep it minimal:

- input/textarea for VC JSON
- input for revoke reason
- `Revoke Credential` button
- success/error message area

Flow:

1. parse VC JSON
2. resolve revocation key via `getRevocationKeyFromVc`
3. read contract address and chain ID from the resolved receipt
4. call `revokeCredentialOnChain(...)`
5. show transaction hash and reason

Do not add persistence. Do not add a new backend service.

**Step 5: Run tests**

Run:

```bash
npx tsx --test src/core/chain/revocation.test.ts src/revocation/key.test.ts src/verifier/revocation.test.ts
```

Expected: PASS

**Step 6: Run build**

Run:

```bash
npm run build
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/core/chain/revocation.ts src/core/chain/revocation.test.ts src/core/index.ts src/ui/App.tsx src/revocation/key.ts
git commit -m "feat: add metamask revocation flow"
```

### Task 4: Surface revocation clearly in verification results

**Files:**
- Modify: `src/ui/App.tsx`
- Modify: `src/verifier/types.ts`
- Reference: `src/verifier/revocation.test.ts`

**Step 1: Write the failing test or snapshot-style assertion**

If adding a dedicated UI test is too heavy for the existing test stack, add one narrow pure helper in `App.tsx` or a nearby utility that formats chain result messaging, then test it. For example:

```ts
test("formatChainStatus returns revoked message when chain result is revoked", () => {
  assert.match(formatChainStatus({ valid: false, revoked: true, revocationReason: "issuer revoked" }), /revoked/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test src/verifier/revocation.test.ts src/core/chain/revocation.test.ts
```

Expected: FAIL if the UI/helper still cannot distinguish revocation from generic chain failure.

**Step 3: Write minimal implementation**

Update the verification UI so that when `verifyResult.chain?.revoked === true`, it renders a specific revoked message instead of only a generic chain error. The UI should display:

- revoked status
- revoke reason
- revocation key when useful for debugging

Keep the overall banner failed.

**Step 4: Run tests and build**

Run:

```bash
npx tsx --test src/revocation/key.test.ts src/verifier/revocation.test.ts src/core/chain/revocation.test.ts
npm run build
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/App.tsx src/verifier/types.ts src/verifier/revocation.test.ts
git commit -m "feat: show revoked vcs as invalid in verifier ui"
```

### Task 5: Manual end-to-end verification and operator docs

**Files:**
- Modify: `README.md`
- Modify: `docs/issuer-architecture.md`
- Create or modify: `docs/troubleshooting-chain-verification.md`

**Step 1: Update docs**

Document:

- the phase-1 revocation key rule: first mandatory component hash
- how to revoke via MetaMask in the UI
- that revocation is IU-specific on `main`
- that a revoked VC remains temporally “not expired” but is still invalid for the custom verifier
- that `StatusList2021` is deferred

**Step 2: Build verification**

Run:

```bash
npm run build
```

Expected: PASS

**Step 3: Manual flow**

1. Issue a VC using the normal UI.
2. Save the VC JSON.
3. Verify it once; expected result: valid.
4. Use the new revoke action with the same MetaMask owner wallet.
5. Verify the same VC again.

Expected:

- `verifyResult.valid === false`
- chain result indicates revoked
- revoke reason is visible in the UI

**Step 4: Commit**

```bash
git add README.md docs/issuer-architecture.md docs/troubleshooting-chain-verification.md
git commit -m "docs: add smart-contract revocation operator flow"
```

### Final Verification

Run:

```bash
npx tsx --test src/revocation/key.test.ts src/verifier/revocation.test.ts src/core/chain/revocation.test.ts src/oid4vci/keys.test.ts src/ui/pickupState.test.ts
npm run build
```

Expected: PASS
