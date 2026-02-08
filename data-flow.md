# IU VC Issuer (Phase 2) — Data Flow

This document shows the **issuance pipeline** and how data moves through the system.

## 1) End‑to‑End Flow (High Level)

```
| UI Form Input |
        |
        v
| hashComponents |
        |
        v
| buildMerkle |
        |
        v
| anchorRoot |
        |
        v
| assembleVc |
        |
        v
| signVc |
        |
        v
| Download vc.json |
```

## 2) Detailed Data Flow (Key Artifacts)

```
| UI: credentialId, subjectDid, validFrom, degree, components[] |
        |
        v
| hashComponents |
| leaf = credentialId||componentType||content |
| componentHash = sha256(leaf) |
        |
        v
| buildMerkle |
| leafHash = keccak256(utf8(componentHash)) |
| merkleRoot + proofs[name] |
        |
        v
| anchorRoot |
| ethers + MetaMask |
| anchorRoot(bytes32) -> anchorTx |
        |
        v
| assembleVc |
| @context, type, issuer, subject |
| iu:components + iu:merkleReceipt |
        |
        v
| signVc |
| DataIntegrityProof |
| eddsa-rdfc-2022 (Ed25519) |
```

## 3) Artifact Map (Inputs/Outputs per Step)

| Step | Input | Output |
|------|-------|--------|
| UI Form | credential fields + components | IssueFormState |
| hashComponents | credentialId + components | HashedComponent[] (`componentHash`) |
| buildMerkle | `{ name, hash: componentHash }[]` | `merkleRoot` + `proofs[name]` |
| anchorRoot | `merkleRoot`, `chainId`, `contractAddress` | `anchorTx` + `chainId` |
| assembleVc | inputs + proofs | **Unsigned VC v2 JSON‑LD** |
| signVc | unsigned VC + Ed25519 key | **Signed VC** with `proof` |

## 4) Files to Read in Order

1. `src/ui/App.tsx`
2. `src/core/hashing/hashComponents.ts`
3. `src/core/merkle/merkle.ts`
4. `src/core/chain/registry.ts`
5. `src/vc/assembleVc.ts`
6. `src/vc/signVc.ts`
