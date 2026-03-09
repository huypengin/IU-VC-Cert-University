# IU-cert-university (Phase 2: IU‑SmartCert → W3C VC v2 Issuer)

Single-package **Vite + React** issuer UI that implements **ONLY Phrase/Phase 2**:

- Reuse IU‑SmartCert logic: component hashing → Merkle tree + per‑component proofs → **anchor Merkle root on-chain**
- Output a **W3C Verifiable Credential (VC) v2 JSON‑LD**
- Sign with **DataIntegrityProof** using cryptosuite **`eddsa-rdfc-2022`** (**Ed25519**)
- Download the VC as `vc.json` for wallet import

Out of scope (intentionally omitted):
- Wallet implementation
- Multiple VC formats
- OID4VP
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
- `docs/statuslist-revocation.md`
- `docs/statuslist2021-revocation-alignment.md`

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

### Status list revocation (optional, wallet-facing)

- `STATUS_LIST_PATH`
  - defaults to `/status/degree/2026/status-list.json`
- `STATUS_LIST_REVOKED_INDEXES`
  - optional comma-separated list of revoked numeric status indexes
- `STATUS_LIST_REVOKED_CREDENTIAL_IDS`
  - optional comma-separated list of credential IDs to mark revoked
  - the issuer derives a deterministic `statusListIndex` from `credentialId`

Generated credentials now point at the canonical registry-hosted
`.../status/<category>/<year>/status-list.json` URL derived from the configured
registry asset host (`SCHEMA_URL` / context URLs). The local issuer can still expose a
short-lived mirror route for debugging, but it is not the authoritative mutable revocation source.

The wallet label `valid` or `never expired` is not the same as revocation; temporal validity
comes from `validFrom` / `validUntil`, while revocation comes from the status list document.

## Issue a VC (UI)

1) Fill `.env` at repo root.
2) Run `npm run dev`.
3) Open the app, fill inputs, click **Issue VC**, then click **Download vc.json**.

Notes:
- On-chain anchoring is done via an injected **EIP‑1193 provider** (MetaMask). If MetaMask is not available, issuing will fail at the anchoring step.
- The generated VC includes:
  - `@context` with VC v2 + 3 custom contexts
  - `type` = `["VerifiableCredential","VNEduDegreeCredential","IUSmartCertCredential"]`
  - `credentialStatus` = `StatusList2021Entry` pointing at the registry status list
  - `credentialSubject["iu:components"]` with `componentHash`
  - top-level `"iu:merkleReceipt"` with `merkleRoot`, `anchorTx`, and per-component proofs
  - top-level `proof` = `DataIntegrityProof` with `cryptosuite: "eddsa-rdfc-2022"`

## Cryptosuite note (Phase 2)

`src/vc/signVc.ts` uses a deterministic **stable JSON stringify** as a demo signing input.
It includes a TODO to replace with proper **RDF Dataset Canonicalization 2022 (RDFC)** for strict `eddsa-rdfc-2022` conformance.
