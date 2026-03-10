# User-Supplied VC Pickup Design

## Problem

The current wallet pickup flow depends on a single filesystem `vc.json` read by the OID4VCI service. That coupling is unstable for three reasons:

- the QR flow does not reliably use the exact VC the user intends to import
- the handoff through a shared root file is hard to maintain and easy to overwrite
- the design quietly introduces a backend-managed canonical credential copy, which conflicts with the current goal of avoiding persistent centralized storage

At the same time, the verifier UI still expects raw pasted JSON instead of treating the VC as a user-managed file artifact.

## Goals

- make verification operate on a user-uploaded VC file rather than pasted JSON
- make QR generation operate on a user-supplied VC rather than a global `vc.json`
- avoid introducing a database or durable backend credential store
- keep the OID4VCI flow compatible with the current wallet pickup architecture
- preserve the custom verifier and smart-contract revocation flow already implemented on `main`

## Non-Goals

- redesign OID4VCI credential semantics
- add durable persistence for issued credentials
- make wallet pickup work without any backend state at all
- redesign revocation or reintroduce `StatusList2021` on `main`

## Approaches Considered

### 1. Transient upload-to-offer session

The browser uploads a VC file when the operator wants to generate a QR code. The server stores that uploaded VC only in an in-memory offer/session map keyed to the pre-authorized-code flow. The credential endpoint later signs the JWT VC from that in-memory snapshot.

Pros:

- removes the unstable global `vc.json` dependency
- does not require a database
- preserves the current OID4VCI flow shape
- supports cross-device wallet pickup because the server can serve the credential later

Cons:

- the uploaded VC exists temporarily in backend memory
- pending pickup offers are lost on process restart

### 2. Pure browser-only QR flow

The browser encodes the entire VC into the QR-related handoff without keeping any backend copy.

Pros:

- no backend state at all

Cons:

- poor fit for the current OID4VCI exchange
- payload size becomes impractical
- credential content leakage risk increases

### 3. Local server file spool

The uploaded VC is written to a generated temporary path on the server and referenced later.

Pros:

- no database
- survives process restart if files remain

Cons:

- reintroduces backend-managed file state
- cleanup becomes operationally messy
- still centralizes credential copies on disk

## Chosen Approach

Approach 1 is the smallest acceptable change.

The browser remains the source of the VC file. The backend keeps only a TTL-bound in-memory copy long enough to complete the OID4VCI pickup exchange. This removes the brittle root `vc.json` dependency while staying within the project's current no-database constraint.

## Design

### 1. Verification Input

The `Verify Credential` tab should accept a VC file upload as the primary path. The browser reads the selected JSON file and uses that parsed VC for:

- standard verification
- chain verification
- smart-contract revocation

Raw paste can be kept only as a secondary/debug path if necessary, but the default UX should be file-based.

### 2. Pickup Input

The `Wallet Pickup` tab should accept a VC file upload. When the operator clicks `Add to Wallet`, the browser uploads the parsed VC JSON to a new pickup endpoint. That endpoint creates a transient offer session and returns the QR/deep-link payload.

### 3. Backend Session Model

The OID4VCI service should add a new in-memory store for uploaded VC payloads, tied to the pre-authorized-code lifecycle.

Each session should include:

- the uploaded VC JSON
- subject identifier
- creation time
- expiry time
- credential configuration id

The credential endpoint should sign the JWT VC from the stored uploaded VC associated with the access token, not from `process.cwd()/vc.json`.

### 4. Data Flow

The new pickup flow becomes:

1. user selects a VC file in the browser
2. browser parses and validates the JSON locally
3. browser sends the VC JSON to the backend pickup endpoint
4. backend creates a pre-authorized-code entry linked to that uploaded VC
5. backend returns the QR/deep-link offer
6. wallet redeems token and credential as before
7. credential endpoint signs from the uploaded VC snapshot linked to the token

### 5. Trust and Centralization Boundary

This design intentionally does not create a durable issuer-side archive. The backend holds only short-lived in-memory state needed to complete the wallet exchange. The user-supplied VC file remains the operator-controlled source artifact.

### 6. Error Handling

The system should fail clearly when:

- the uploaded file is not valid JSON
- the VC shape is missing required claims for JWT conversion
- no VC session is associated with the token
- the in-memory session expired or was lost due to process restart

These failures should surface explicit operator messages in both the UI and the OID4VCI API logs.

### 7. Testing

The implementation should add tests for:

- local file parsing helpers in the UI
- pickup-offer creation from uploaded VC content
- token-to-uploaded-VC linkage in the OID4VCI service
- credential issuance that proves the endpoint no longer depends on root `vc.json`

## Expected Outcome

After implementation:

- verification becomes file-based and more operator-friendly
- QR generation uses the exact user-selected VC
- the OID4VCI server no longer depends on a shared root `vc.json`
- no database is introduced
- the system remains explicitly non-durable across restarts, which is acceptable for the current demo/prototype scope
