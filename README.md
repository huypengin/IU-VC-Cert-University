# IU-cert-university (IU-SmartCert VC Issuer + Verifier)

Single-package **Vite + React** issuer and verifier UI that currently implements:

- Reuse IU‑SmartCert logic: component hashing → Merkle tree + per‑component proofs → **anchor Merkle root on-chain**
- Output a **W3C Verifiable Credential (VC) v2 JSON‑LD**
- Sign with **DataIntegrityProof** using cryptosuite **`eddsa-rdfc-2022`** (**Ed25519**)
- Download the VC as `vc.json` for wallet import
- Verify a VC against the smart contract anchoring and revocation state
- Revoke a VC on-chain through MetaMask using the contract owner wallet

Out of scope (intentionally omitted):
- Wallet implementation
- Multiple VC formats
- OID4VP
- `StatusList2021` / public bitstring status endpoints on `main`
- Selective disclosure inside wallets

## Project structure

```text
IU-cert-university/
  package.json
  vite.config.ts
  tsconfig.json
  src/
    ui/                 # React issuer + verifier UI
    core/               # pure logic: hashing, merkle, chain anchoring, MetaMask tx helpers
    revocation/         # revocation-key extraction and request building
    verifier/           # standard, merkle, and on-chain verification pipeline
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

## Wallet Pickup Demo (OID4VCI)

Run these commands in separate terminals:

```bash
npm install
npm run oid4vci
npm run dev
```

Public tunnel mode (recommended for mobile wallets and cross-device testing):

```bash
npm install
npm run oid4vci:tunnel
npm run dev
```

UI-to-issuer URL resolution for wallet pickup:
- `OID4VCI_BASE_URL` (if set)
- else `BASE_URL` (if set)
- else `http://localhost:8787`

When using `oid4vci:tunnel`, `BASE_URL` is derived from `NGROK_DOMAIN` automatically.

User flow:
1. Open the app and switch to the `Wallet Pickup` tab.
2. Click `Add to Wallet`.
3. Scan the QR code from a wallet app or tap the deep link.
4. If the code expires, click `Generate new QR` and retry.

Full runbook: `docs/oid4vci-wallet-demo.md`

Additional technical docs:
- `docs/wallet-verification-import-flow.md`
- `docs/issuer-architecture.md`

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

### Chain anchoring and revocation (required for real on-chain anchoring)

- `CHAIN_ID` (format: `eip155:<number>`, e.g. `eip155:11155111`)
- `RPC_URL` (reserved for a future non-MetaMask flow; not used by the current UI implementation)
- `CONTRACT_ADDRESS` (a deployed contract that supports `anchorRoot(bytes32)`, `verify(bytes32[],bytes32)`, `isValid(bytes32)`, and `revokeCertificate(bytes32,string)`)
  - **Phase 2 Frozen Contract**: `0x0582770bea93B40807D422F22eF8FC4288c81Cb4` (Sepolia)
- ABI used by the UI: `src/contracts/abi/Root.json`

### OID4VCI Tunnel (optional)

- `NGROK_DOMAIN` (required for `npm run oid4vci:tunnel`)
  - example: `my-issuer.ngrok-free.app` (host only) or `https://my-issuer.ngrok-free.app`
- `NGROK_AUTHTOKEN` (optional if not already configured with `ngrok config add-authtoken`)

### OID4VCI issuer server only (not bundled to browser)

- `OID4VCI_PRIVATE_JWK`
  - Required for registry-aligned JWT issuance
  - Must be an ES256 private JWK matching the registry DID document public key
  - Set `kid` to the DID verification method ID, for example:
    `did:web:infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle#key-1`

When `OID4VCI_PRIVATE_JWK` is set this way, OID4VCI JWT VCs and issuer metadata
advertise `ES256` and emit the same `kid` as the registry DID document.

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

## Revoke a VC (UI)

The current `main` branch uses the smart contract revocation list as the authoritative revocation source for the custom verifier.

Revocation rule:
- the revocation lookup key is the **first mandatory component hash** in the Merkle receipt

Operator flow:
1. Issue a VC and keep the downloaded `vc.json`.
2. Open the `Verify Credential` tab.
3. Paste the VC JSON into the verifier input.
4. Enter a revoke reason.
5. Click `Revoke Credential` and approve the MetaMask transaction from the contract owner wallet.
6. Re-run verification for the same VC.

Expected behavior:
- before revocation: the VC can verify as valid
- after revocation: the verifier returns `valid = false`
- the chain result shows `Revoked On-Chain` plus the revoke reason

Important scope note:
- this revocation model is **IU-specific**
- a revoked VC may still appear temporally valid or never-expiring because revocation is separate from `validUntil`
- `StatusList2021` interoperability is deferred and remains future work outside `main`

## Cryptosuite note (Phase 2)

`src/vc/signVc.ts` uses a deterministic **stable JSON stringify** as a demo signing input.
It includes a TODO to replace with proper **RDF Dataset Canonicalization 2022 (RDFC)** for strict `eddsa-rdfc-2022` conformance.
