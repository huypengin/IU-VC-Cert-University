# Smart-Contract Revocation Flow Design

## Objective

Implement the simplest complete revocation flow on `main` using the existing IU-SmartCert smart contract model. In this phase, revocation is controlled by the issuer wallet through MetaMask and enforced by the custom verifier. The `StatusList2021` path remains deferred and isolated from `main`.

## Problem

The current repository already supports:

- anchoring a Merkle root on-chain during issuance;
- representing component hashes and Merkle proofs in the VC;
- verifying signature, temporal validity, Merkle consistency, and anchor transaction data.

However, the verifier does not yet treat on-chain revocation as a first-class invalidation condition, even though the deployed contract model already exposes `revokeCertificate(bytes32,string)` and `isValid(bytes32)`.

As a result, the system can issue and verify anchored credentials, but cannot yet complete the operational flow:

```text
issue -> anchor -> revoke on-chain -> verify -> invalid
```

## Phase-1 Scope

This phase intentionally implements only the smart-contract revocation path.

Included:

- a MetaMask-driven revoke action in the issuer UI;
- selection of the canonical revocation key from the VC data;
- verifier support for contract revocation checks;
- UI surfacing of revocation failure and revoke reason;
- tests covering the revoke key extraction and verifier invalidation behavior.

Excluded:

- `StatusList2021`;
- wallet interoperability work;
- registry-backed mutable status documents;
- new persistence layers or issuance databases;
- redesign of the contract’s revocation data structure.

## Canonical Revocation Key

The phase-1 revocation key is the first mandatory component hash contained in the credential receipt.

This choice is recommended because:

- the contract already expects a single `bytes32` revocation key;
- mandatory component hashes already exist in the VC issuance path;
- the verifier can deterministically recover the same key from the VC;
- the implementation remains minimal and consistent with the current contract.

The rule is therefore:

```text
revocationKey = first(receipt.componentsProofs where mandatory = true).hash
```

If no mandatory component exists, the revoke operation and revocation verification must fail explicitly.

## Recommended Architecture

### 1. Issuer-side revoke action

The UI should allow an operator to paste or load an issued VC, extract the revocation key from its receipt, enter a revocation reason, and submit `revokeCertificate(revocationKey, reason)` through MetaMask to the configured contract.

The revoke action should use the same chain and contract configuration already used for anchoring. This keeps ownership and operational control with the same MetaMask account that anchors issuance data.

### 2. Verifier-side revocation enforcement

After Merkle verification succeeds, the verifier should recover the same revocation key and query the contract via `isValid(revocationKey)`.

If the contract returns revoked, the verifier must:

- set the overall verification result to `valid = false`;
- keep the verification phase as advanced verification;
- expose the revoke reason in the chain result;
- make the failure visible in the UI as a revocation-driven invalidation.

### 3. Result semantics

Revocation is terminal for the custom verifier in this phase. A revoked VC is invalid even if:

- the signature is valid;
- `validFrom` and `validUntil` pass;
- the Merkle receipt is internally correct;
- the anchor transaction exists and matches the Merkle root.

This establishes a clear rule: temporal validity and cryptographic integrity are necessary but not sufficient once on-chain revocation is supported.

## Alternatives Considered

### Approach A: Smart-contract-only revocation on `main`

This is the recommended phase-1 approach.

Advantages:

- reuses the existing contract and verifier architecture;
- minimal new code surface;
- produces a complete issuer-controlled operational flow quickly;
- avoids mixing partially deployed interoperability work into `main`.

Disadvantages:

- not interoperable with generic wallets;
- revocation can be checked only by IU-aware verifiers.

### Approach B: Introduce a credential database first

This would store issued credential metadata and revocation keys server-side before adding revoke actions.

Advantages:

- better long-term operator workflow;
- easier future audit and administration.

Disadvantages:

- adds persistence and application complexity before the core flow is proven;
- unnecessary for the first complete end-to-end implementation.

### Approach C: Resume `StatusList2021` immediately

This would aim for interoperability now.

Advantages:

- better alignment with standard wallet behavior.

Disadvantages:

- larger scope;
- requires mutable status publication infrastructure;
- distracts from finishing the already available on-chain revocation path.

This approach is intentionally deferred.

## Data Flow

### Issue

1. The issuer UI hashes components.
2. The issuer UI builds the Merkle tree and anchors the root on-chain.
3. The VC is signed and exported with receipt data containing component proofs.

### Revoke

1. The operator loads the issued VC into the revoke workflow.
2. The app resolves the receipt and selects the first mandatory component hash.
3. The app submits `revokeCertificate(hash, reason)` via MetaMask.
4. The contract records the revoke reason under that hash.

### Verify

1. The verifier runs standard VC checks.
2. The verifier resolves the receipt and verifies Merkle proofs.
3. The verifier verifies anchoring and contract connectivity.
4. The verifier calls `isValid(revocationKey)`.
5. If revoked, the final result is invalid and includes the reason.

## Error Handling

The phase-1 flow should fail explicitly for:

- missing or malformed receipt data;
- no mandatory component in the receipt;
- missing MetaMask or wrong chain;
- wrong contract address;
- non-owner revocation transaction failure;
- contract read failure during verification.

Failure messages should distinguish between:

- anchor verification failure;
- contract connectivity failure;
- explicit revocation;
- operator-side revoke transaction failure.

## Testing Strategy

Tests should cover:

- extraction of the revocation key from a VC receipt;
- failure when no mandatory component is present;
- verifier invalidation when the contract reports revoked;
- preservation of normal valid behavior when the contract reports not revoked;
- UI rendering of revoke reason and invalid state.

The initial implementation may mock contract reads and writes in unit tests, while leaving live MetaMask and chain interaction to manual verification.

## Future Compatibility

This design does not reject future interoperability work. Instead, it establishes a clear sequencing model:

1. Finish the IU-specific on-chain revocation flow on `main`.
2. Keep `feat/statuslist-revocation` isolated.
3. Later add a standard wallet-facing revocation layer, likely by updating both:
   - the contract-based revocation source used by the custom verifier; and
   - a `StatusList2021` publication layer used by generic wallets.

At that point, one operator action may update both revocation layers, but phase 1 does not require that coupling.

## Decision

Proceed with a smart-contract-first revocation implementation on `main` using:

- MetaMask-triggered revoke transactions;
- the first mandatory component hash as the revocation key;
- verifier invalidation when the contract reports revoked;
- deferral of `StatusList2021` to a later interoperability phase.
