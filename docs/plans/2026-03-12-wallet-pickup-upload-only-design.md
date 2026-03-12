# Wallet Pickup Upload-Only Design

## Problem

The current `main` Wallet Pickup tab still exposes `subject_id` as the primary operator input and generates offers through `GET /oid4vci/pickup-offer?subject_id=...`.

That no longer matches the intended development flow:

- the operator already has a concrete VC file
- the backend already supports `POST /oid4vci/pickup-offer` with uploaded VC content
- the visible `subject_id` field adds confusion because it looks like the important artifact, when the VC file is the real source of truth

## Goals

- make Wallet Pickup on `main` upload-only in the UI
- require a VC JSON file before `Add to Wallet` is enabled
- parse and validate the uploaded VC locally before POSTing it
- send the uploaded VC to `POST /oid4vci/pickup-offer`
- show useful operator context such as filename and detected subject DID
- keep the existing backend `GET` subject-based route as a hidden fallback/debug path

## Non-Goals

- remove the backend `GET /oid4vci/pickup-offer` route
- redesign the OID4VCI backend flow
- add durable storage for uploaded credentials
- redesign the Verify tab in this change

## Approaches Considered

### 1. Upload-only UI, keep subject-based backend path hidden

The Wallet Pickup tab only accepts a VC JSON file. The browser parses the file, derives subject information when available, and posts the VC to the existing upload endpoint.

Pros:

- matches the intended operator workflow
- smallest change because backend support already exists
- removes the confusing visible `subject_id` field without deleting fallback backend behavior

Cons:

- requires a small amount of client-side file parsing and validation

### 2. Keep both upload and subject inputs visible

The UI supports both upload and manual subject entry.

Pros:

- more flexible for debugging

Cons:

- preserves the exact UX confusion we want to remove
- makes the Wallet Pickup tab look like it has two competing sources of truth

### 3. Remove subject-based flow from both frontend and backend

The entire subject-only path is deleted.

Pros:

- clean external surface

Cons:

- unnecessary scope for this change
- removes a backend fallback that can still help with debugging

## Chosen Approach

Approach 1 is the right fit for `main`.

The Wallet Pickup tab becomes upload-only, while the backend `GET` path remains intact but no longer appears in the primary UI. That keeps the dev UX simple without taking on avoidable backend risk.

## Design

### 1. Wallet Pickup Input

The `Wallet Pickup` tab should replace the visible `Subject DID` input with:

- one file input for VC JSON
- a local summary of the selected file
- a detected subject DID when `credentialSubject.id` exists

The upload becomes the only path that enables `Add to Wallet`.

### 2. Local Validation

The browser should read the selected file and fail early when:

- the file is not valid JSON
- the parsed JSON is not object-shaped
- the object does not look like a VC payload suitable for pickup

Validation should stay minimal and pragmatic for the current prototype. We only need enough checks to avoid posting obviously bad input.

### 3. Pickup API Call

The frontend should add a POST helper for `/oid4vci/pickup-offer` that sends:

- `vc`
- optionally `subject_id` derived from `vc.credentialSubject.id`

The UI should stop using the visible subject-based GET flow.

### 4. Offer Rendering

Once the POST succeeds, the UI should behave as it does today:

- render the deep link
- render the QR code
- show the expiry countdown
- allow generating a fresh offer from the same uploaded VC

### 5. Error Handling

The UI should show clear operator errors for:

- invalid JSON uploads
- invalid VC-shaped payloads
- network or backend failures during offer generation

Changing or clearing the file should reset the stale offer state so an old QR is not shown for a new upload.

### 6. Testing

This change should add or update tests for:

- local pickup VC file parsing
- frontend POST helper request shape
- Wallet Pickup button enablement and upload-driven offer generation

## Expected Outcome

After this change, the current `main` Wallet Pickup flow will match the development workflow:

- operator selects a VC file
- browser validates and uploads that VC
- backend creates an OID4VCI pickup offer from that uploaded VC
- the tab shows QR and deep link for that exact credential

The visible `subject_id` field no longer drives the main UX.
