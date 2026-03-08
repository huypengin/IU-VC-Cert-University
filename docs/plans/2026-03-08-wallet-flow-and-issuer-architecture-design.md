# Wallet Flow And Issuer Architecture Design

## Goal

Add two detailed technical documents:

1. A wallet verification and import flow document that explains how the wallet interacts with the issuer and registry before importing a credential.
2. An issuer architecture document that explains the runtime topology, component boundaries, signing paths, and configuration model of this repository.

## Context

- The repository already has:
  - `docs/oid4vci-wallet-demo.md` for operational setup
  - `docs/verification-logic.md` for verifier-side logic
  - `README.md` for project overview
- It does not yet have a dedicated architecture-level explanation of:
  - how the wallet pickup flow traverses UI -> issuer -> registry -> wallet verification/import
  - how the issuer codebase is split between VC generation, OID4VCI issuance, key management, and registry dependencies

## Chosen Structure

Create two separate docs:

- `docs/wallet-verification-import-flow.md`
- `docs/issuer-architecture.md`

This separation keeps the protocol/runtime flow understandable for integrators while keeping implementation architecture readable for developers and reviewers.

## Document 1: Wallet Verification And Import Flow

### Purpose

Explain the end-to-end flow from a user clicking wallet pickup in the UI to the wallet verifying the JWT VC and importing it into its local credential store.

### Coverage

- Actors:
  - User
  - IU issuer UI
  - OID4VCI issuer API
  - Registry `did:web` endpoints
  - Registry context/schema endpoints
  - Wallet verification/import subsystem
  - Wallet local DB/store
- Request/response sequence:
  - UI calls `/oid4vci/pickup-offer`
  - Wallet opens `credential_offer_uri`
  - Wallet resolves issuer metadata
  - Wallet exchanges pre-authorized code for token
  - Wallet requests credential
  - Issuer signs JWT VC with ES256
  - Wallet resolves issuer `did:web` document from registry
  - Wallet verifies JWT signature using the DID document key
  - Wallet accepts and imports the credential
- Failure points:
  - metadata URL mismatch
  - wrong `kid`
  - wrong ES256 keypair
  - unreachable registry
  - expired pre-authorized code or access token

### Presentation

- Mermaid sequence diagram
- Step-by-step flow with concrete endpoints
- “Who does what” responsibility table
- Failure matrix

### Accuracy Note

The document should state clearly that wallet DB persistence is described from observed protocol behavior and standard wallet architecture. The repository does not contain Sphereon wallet internals.

## Document 2: Issuer Architecture

### Purpose

Explain the architecture of this repository as an issuer system, especially the split between JSON-LD/Data Integrity issuance and OID4VCI/JWT issuance.

### Coverage

- Runtime components:
  - React UI
  - OID4VCI Express server
  - VC assembly and signing pipeline
  - key management
  - registry dependency
  - optional ngrok/public URL layer
- Codebase boundaries:
  - `src/ui/**`
  - `src/core/**`
  - `src/vc/**`
  - `src/oid4vci/**`
  - external registry and wallet interactions
- Signing split:
  - UI-generated VC JSON-LD path uses Ed25519 Data Integrity in `src/vc/**`
  - OID4VCI wallet issuance path uses ES256 JWT signing in `src/oid4vci/**`
- Configuration model:
  - browser-injected env vs server-only env
  - `ISSUER_ED25519_PRIVATE_KEY` vs `OID4VCI_PRIVATE_JWK`
  - `BASE_URL`, `OID4VCI_BASE_URL`, `NGROK_DOMAIN`

### Presentation

- Mermaid component/runtime diagram
- Layered architecture explanation
- Request/data flow narrative
- Configuration table

## Non-Goals

- No changes to protocol behavior
- No changes to wallet implementation
- No changes to registry implementation
- No reverse-engineering of proprietary Sphereon storage internals beyond what can be safely inferred from standard flow
