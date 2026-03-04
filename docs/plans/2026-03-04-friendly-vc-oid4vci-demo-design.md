# Friendly VC Wallet Demo Design (OID4VCI)

Date: 2026-03-04
Status: Approved
Owner: IU-cert-university team

## 1) Goal

Design a non-technical credential pickup flow so a student can add an issued credential to a Friendly VC-compatible wallet using OID4VCI, without manual JSON handling.

## 2) Scope

In scope:
- OID4VCI pre-authorized code demo flow.
- Desktop + mobile user journey for wallet pickup.
- UX states for success, expiration, and retry.
- Demo operational requirements.

Out of scope:
- Building a wallet app.
- Full production auth/identity proofing.
- Multi-tenant issuer hardening.

## 3) Context (Current Project State)

Existing capabilities already present in this repository:
- OID4VCI issuer server script: `npm run oid4vci`
- Endpoints:
  - `GET /.well-known/openid-credential-issuer`
  - `GET /.well-known/jwks.json`
  - `GET /oid4vci/credential-offer`
  - `POST /oid4vci/token`
  - `POST /oid4vci/credential`
- Current issuance logic transforms local `vc.json` to a signed JWT VC in the credential endpoint.
- Pre-authorized code and access token are one-time and short-lived (5 minutes).

## 4) User Personas

- Student (non-technical): wants one-click or one-scan credential pickup.
- Demo operator: starts issuer server and shares pickup screen/URL.

## 5) Functional Requirements

1. Student can pick up credential via OID4VCI in under 60 seconds.
2. System supports both:
   - QR scan (desktop scenario)
   - Deep link open (mobile scenario)
3. Expired or used offer can be regenerated with one action.
4. Normal flow does not require uploading/importing `vc.json` manually.

## 6) Approach Options Considered

## Option A: QR-only OID4VCI offer page

Pros:
- Simple and familiar for demos.
- Works well when presenter uses desktop and attendee uses phone.

Cons:
- Less convenient when user is already on mobile.

## Option B: Deep link first + QR fallback (Recommended)

Pros:
- Best non-technical UX across devices.
- One tap on mobile, one scan on desktop.
- Keeps standards-based OID4VCI flow.

Cons:
- Requires link formatting and platform-specific handling checks.

## Option C: Manual `vc.json` import fallback only

Pros:
- Easiest technically.

Cons:
- Not aligned with OID4VCI-first objective.
- Worse non-technical experience.

Recommendation: Option B.

## 7) Approved Demo Workflow

1. Student opens a simple pickup page: `Get My Degree Credential`.
2. Student taps `Add to Wallet`.
3. Issuer backend generates pre-authorized offer via `/oid4vci/credential-offer`.
4. Pickup page renders:
   - QR code containing the OID4VCI credential offer URI.
   - Mobile deep link button to open wallet directly.
5. Wallet executes:
   - token exchange: `POST /oid4vci/token`
   - credential request: `POST /oid4vci/credential`
6. Issuer returns signed JWT VC payload.
7. UI confirms success: `Credential added to wallet`.
8. On failure (expired/used code), UI shows `Generate new QR`.

## 8) UX and Error Handling

Required screen states:
- Ready: button to generate offer.
- Offer active: QR + deep link + expiry countdown.
- Success: confirmation and optional "View in wallet" guidance.
- Expired/used: clear error and one-click regeneration.
- Network/server error: retry and fallback instructions.

Copy guidelines:
- Avoid technical terms like "pre-authorized_code" in UI.
- Use plain language: "Scan this code with your wallet app."

## 9) Architecture/Data Flow

- Frontend pickup page requests an offer object from issuer.
- Frontend builds:
  - `openid-credential-offer://...` deep link
  - QR payload with equivalent offer URI
- Wallet handles OAuth pre-authorized grant against issuer endpoints.
- Credential endpoint signs and returns JWT VC from current source `vc.json`.

## 10) Security and Demo Constraints

- Use HTTPS and a publicly reachable issuer URL for real wallet interoperability.
- Keep short TTL and one-time code behavior.
- For demo only, current `vc.json` source is acceptable; production should bind credential subject to authenticated user identity.

## 11) Acceptance Criteria

1. User can complete wallet pickup in <= 60 seconds.
2. Flow works on:
   - Desktop presenter + phone wallet (QR)
   - Phone browser + wallet app (deep link)
3. Expired/used offers recover with one click.
4. No manual file import in primary flow.

## 12) Next Step

Create implementation plan from this design using `writing-plans` skill.
