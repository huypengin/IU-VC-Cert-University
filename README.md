# IU-cert-university (Phase 2: IU‑SmartCert → W3C VC v2 Issuer)

Single-package **Vite + React** issuer UI that implements **ONLY Phrase/Phase 2**:

- Reuse IU‑SmartCert logic: component hashing → Merkle tree + per‑component proofs → **anchor Merkle root on-chain**
- Output a **W3C Verifiable Credential (VC) v2 JSON‑LD**
- Sign with **DataIntegrityProof** using cryptosuite **`eddsa-rdfc-2022`** (**Ed25519**)
- Download the VC as `vc.json` for wallet import

Out of scope (intentionally omitted):
- Wallet implementation
- Multiple VC formats
- OID4VCI/OID4VP
- StatusList2021 / public bitstring status endpoints
- Verifier UI
- Selective disclosure inside wallets

## Project structure

```text
IU-cert-university/
  package.json
  vite.config.ts
  tsconfig.json
  src/
    ui/                 # React issuer UI (1 page)
    core/               # pure logic: hashing, merkle, chain anchoring
    vc/                 # VC assembly + DataIntegrityProof signing
    contracts/
      abi/              # minimal ABI JSON used by the issuer (NOT compiled)
      solidity/         # legacy Solidity sources (kept; NOT compiled)
    schemas/            # moved 1.0, 1.1, __generated__ (types + examples)
    legacy/
      iu-smartcert-dapp/ # old CRA dApp source (not built)
```

Boundary rule:
- `src/core/**` and `src/vc/**` do **not** import from `src/ui/**`.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Environment variables

This project injects only a small allowlist of env keys (see `vite.config.ts`) so env keys match the names below (no `VITE_` prefix).

WARNING: `.env` values are bundled into the browser build. Do not use production keys.

### Required (VC creation + signing)

- `ISSUER_DID`
- `SCHEMA_URL`
- `DEGREE_CONTEXT_URL`
- `IU_SMARTCERT_CONTEXT_URL`
- `MERKLE_CONTEXT_URL`
- `ISSUER_ED25519_PRIVATE_KEY`
  - Encoding: **hex (64 chars, no 0x)** OR **base64 (32 bytes)**

### Chain anchoring (required for real on-chain anchoring)

- `CHAIN_ID` (format: `eip155:<number>`, e.g. `eip155:11155111`)
- `RPC_URL` (reserved for a future non-MetaMask flow; not used by the current UI implementation)
- `CONTRACT_ADDRESS` (a deployed contract that supports `anchorRoot(bytes32)`)
- ABI used by the UI: `src/contracts/abi/Root.json`

## Issue a VC (UI)

1) Fill `.env` at repo root.
2) Run `npm run dev`.
3) Open the app, fill inputs, click **Issue VC**, then click **Download vc.json**.

Notes:
- On-chain anchoring is done via an injected **EIP‑1193 provider** (MetaMask). If MetaMask is not available, issuing will fail at the anchoring step.
- The generated VC includes:
  - `@context` with VC v2 + 3 custom contexts
  - `type` = `["VerifiableCredential","VNEduDegreeCredential","IUSmartCertCredential"]`
  - `credentialSubject["iu:components"]` with `componentHash`
  - top-level `"iu:merkleReceipt"` with `merkleRoot`, `anchorTx`, and per-component proofs
  - top-level `proof` = `DataIntegrityProof` with `cryptosuite: "eddsa-rdfc-2022"`

## Cryptosuite note (Phase 2)

`src/vc/signVc.ts` uses a deterministic **stable JSON stringify** as a demo signing input.
It includes a TODO to replace with proper **RDF Dataset Canonicalization 2022 (RDFC)** for strict `eddsa-rdfc-2022` conformance.
