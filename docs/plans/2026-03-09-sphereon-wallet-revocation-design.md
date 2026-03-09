# Sphereon Wallet Revocation Compatibility Design

**Date:** 2026-03-09

## Goal

Determine whether the current IU SmartCert on-chain revocation design is sufficient for Sphereon wallet-visible revocation, and define the required architecture if it is not.

## Approved Design Conclusion

The current custom hashed-map smart-contract revocation design is sufficient for IU-controlled verification, but insufficient for wallet-visible interoperable revocation unless the issued VC also includes a Sphereon-supported standard `credentialStatus` mechanism, practically `StatusList2021Entry` at this time.

## Current State

- IU-controlled verification can use the smart contract revocation mapping and Merkle receipt evidence.
- The wallet-issued JWT VC path currently does not include `credentialStatus`.
- The wallet UI showing `valid` or `never expired` can be explained by temporal validity fields such as `validFrom` and absent `validUntil`; this does not prove revocation support.
- The repository already contains a custom example type, `IUSmartCertOnChainStatusEntry`, but this is an IU extension and not evidence of wallet interoperability.

## Compatibility Assessment

### Approach 1: Keep custom on-chain revocation only

**Description:** Continue using the hashed-map smart contract as the sole revocation source.

**Pros:**
- Reuses the existing revocation and verifier model.
- Keeps revocation directly tied to blockchain state.

**Cons:**
- Sphereon wallet should not be expected to understand or display revocation from a custom smart-contract status type.
- Wallet-visible revocation remains non-interoperable.

**Decision:** Reject if wallet-visible revocation is required.

### Approach 2: Add wallet-facing `StatusList2021Entry` and keep on-chain revocation as optional secondary evidence

**Description:** Issue credentials with a standard status-list entry that Sphereon can resolve, while retaining the smart contract for IU-controlled audit, anchoring, or verifier-specific checks.

**Pros:**
- Aligns with documented Sphereon-compatible status handling.
- Preserves the existing on-chain trust model where it still adds value.
- Separates interoperable wallet UX from IU-specific verification logic.

**Cons:**
- Adds a second revocation representation that must remain consistent.
- Requires status list publishing and update operations.

**Decision:** Recommended.

### Approach 3: Move directly to `BitstringStatusListEntry`

**Description:** Adopt the newer bitstring status model as the primary revocation format.

**Pros:**
- Closer to newer standards direction.

**Cons:**
- Current Sphereon material does not indicate this is the safe compatibility target now.
- Higher risk of wallet-side non-recognition.

**Decision:** Reject for current interoperability needs.

## Recommended Architecture

Use a dual-mode revocation model:

- **Wallet-facing path:** publish and reference `StatusList2021Entry` so Sphereon can determine revocation status in its own UX.
- **IU-controlled verification path:** keep the Merkle receipt and smart-contract revocation model as optional secondary verification and audit data.

## Required Repository Changes

1. Add a standard `credentialStatus` model to the VC assembly and JWT VC mapping.
2. Publish a `StatusList2021Credential` endpoint reachable by Sphereon wallet clients.
3. Ensure revocation operations update the status list.
4. Decide whether the smart contract remains authoritative, mirrored, or optional for IU-only verification.
5. Update docs and tests to reflect the distinction between temporal validity and revocation.

## Success Criteria

- Sphereon wallet can import the credential and resolve revocation through a supported standard status mechanism.
- A revoked credential is surfaced as revoked in wallet or wallet-driven verification UX.
- IU can still perform its own verifier-specific on-chain checks if desired.

## Out Of Scope

- Reverse-engineering proprietary Sphereon internals beyond documented behavior.
- Assuming custom smart-contract status resolution in third-party wallets.
- Migrating immediately to unsupported or unverified status formats.
