# Wallet Pickup Copy Offer URL Design

## Problem

The current `Offer Ready` panel still renders an `Open Wallet Deep Link` action.

That is less useful than a copyable offer URI for the current development workflow because:

- operators may want to paste the offer URI into another device or tool
- the offer URI itself is the important artifact
- a deep-link button hides the exact value being used

## Goal

Replace the deep-link action with a copyable offer URL action while keeping the QR flow unchanged.

## Non-Goals

- changing the OID4VCI offer format
- changing QR generation
- changing backend pickup behavior
- redesigning the rest of the Wallet Pickup tab

## Approaches Considered

### 1. Replace deep link with `Copy Offer URL`

Render the `offerUri` in the panel and add a button that copies it to the clipboard.

Pros:

- matches the operator workflow better
- exposes the exact offer being copied
- small, low-risk UI change

Cons:

- requires clipboard feedback handling

### 2. Keep the deep-link button but make it copy instead

Pros:

- minimal visual change

Cons:

- misleading label and behavior mismatch

### 3. Show raw URL without any button

Pros:

- simplest implementation

Cons:

- worse UX than one-click copy

## Chosen Approach

Approach 1.

The `Offer Ready` panel should show the raw `offerUri`, replace the deep-link action with `Copy Offer URL`, and provide short feedback for copy success or failure.

## Design

### 1. Panel Action

Replace the anchor in `WalletPickupPanel` with a button labeled `Copy Offer URL`.

### 2. Offer Visibility

Render the `offerUri` as visible text in the panel so the operator can inspect what is being copied.

### 3. Copy Behavior

The UI should attempt to copy `pickupOffer.offerUri` via the browser clipboard API.

On success:

- show a short confirmation message such as `Offer URL copied`

On failure:

- show a short error message in the pickup section

### 4. Testing

Add focused tests that prove:

- the old deep-link label is gone
- the copy button is present
- the visible `offerUri` is rendered
- the copy helper reports success and propagates failures

## Expected Outcome

The Wallet Pickup tab keeps the same QR flow, but the primary action becomes copying the exact OID4VCI offer URI instead of opening it directly.
