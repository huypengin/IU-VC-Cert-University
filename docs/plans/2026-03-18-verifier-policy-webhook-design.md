# Verifier Policy Webhook Design

## Problem

This repository already contains reusable IU-SmartCert verification logic in `src/verifier/**`, but it does not expose a server-side webhook endpoint that `walt.id` can call as a VC policy decision point.

The current Express server code is also organized around one OID4VCI flow under `src/oid4vci/**`. That is acceptable for a demo, but it does not scale well for adding more server domains. The new verifier-policy work should establish a cleaner module layout so future server features can be added without coupling transport code, business logic, and app bootstrapping.

## Goals

- add a distinct server-side verifier-policy module
- expose a VC policy webhook endpoint for `walt.id`
- keep Express for the demo implementation
- organize the server files so they map cleanly to future NestJS-style modules
- keep reusable IU verification logic separate from Express-specific code
- require bearer-token authentication for the webhook
- make the endpoint decide from raw VC JSON alone, without session context
- fail closed for all non-`2xx` outcomes

## Non-Goals

- turn this repo into the main OpenID4VP verifier
- own verification-session creation, polling, SSE, or redirects
- proxy wallet traffic
- redesign the existing VC verification algorithms during this change
- silently replace missing `walt.id` generic policies such as `signature` or `allowed-issuer`

## Approaches Considered

### 1. Minimal add-on beside `src/oid4vci/**`

Add a new verifier webhook beside the existing OID4VCI files and wire it directly into the current server entrypoint.

Pros:

- smallest short-term change
- low refactor effort

Cons:

- keeps server organization ad hoc
- makes future modules harder to add cleanly
- mixes transport growth with feature growth

### 2. Modular server layer with shared app composition

Introduce a `src/server/**` application layer, move OID4VCI under it, and add a dedicated verifier-policy module with route/controller/service boundaries.

Pros:

- best balance between delivery speed and maintainability
- preserves Express while reducing framework coupling
- creates a clean migration path to NestJS-style modules later
- makes future server modules predictable

Cons:

- requires a moderate refactor now

### 3. Heavy ports-and-adapters abstraction

Design an aggressively abstract server architecture with generalized adapters and ports before adding the webhook.

Pros:

- strongest theoretical portability

Cons:

- over-engineered for this demo repo
- slows delivery without near-term value

## Chosen Approach

Approach 2 is the right fit.

This change should introduce a real `src/server/**` application layer, keep Express as the transport, and organize each capability as a self-contained module. The verifier-policy webhook should wrap the existing IU verification logic, not replace it.

## Design

### 1. Server Module Architecture

The repository should introduce this top-level server structure:

```text
src/
  server/
    app/
      createApp.ts
    entries/
      oid4vci.server.ts
      verifierPolicy.server.ts
    shared/
      config/
        serverEnv.ts
      http/
        errorResponse.ts
      security/
        bearerAuth.ts
    modules/
      oid4vci/
        oid4vci.routes.ts
        oid4vci.controller.ts
        oid4vci.service.ts
        keys.ts
        offerUri.ts
      verifierPolicy/
        verifierPolicy.routes.ts
        verifierPolicy.controller.ts
        verifierPolicy.service.ts
        verifierPolicy.types.ts
```

Rules for the structure:

- `entries/*` only bootstrap the HTTP server and choose which modules to mount
- `routes` only define Express paths and middleware
- `controller` only translates HTTP requests and responses
- `service` owns the use case and calls reusable verifier logic
- `shared/*` contains transport-wide helpers such as auth and error mapping
- IU verification math remains in `src/verifier/**`

### 2. Webhook Contract

The webhook endpoint should be:

- `POST /api/verifier/policies/vc`
- `Authorization: Bearer <VERIFIER_POLICY_BEARER_TOKEN>`
- `Content-Type: application/json`
- body: raw VC JSON only

The receiver must:

- reject missing or non-JSON content types
- not depend on `sessionId`, `queryId`, or broader verifier-session context
- return quickly to `walt.id`
- log operator diagnostics internally

The response body may include diagnostics, but the control signal is the HTTP status.

Representative accept response:

```json
{
  "decision": "accept",
  "checks": {
    "merkle": "passed",
    "chain": "passed",
    "revocation": "active",
    "issuerTrust": "trusted"
  }
}
```

Representative reject response:

```json
{
  "decision": "reject",
  "reason": "credential revoked",
  "checks": {
    "merkle": "passed",
    "chain": "passed",
    "revocation": "revoked",
    "issuerTrust": "trusted"
  }
}
```

Status model:

- `200`: IU policy passes
- `409`: credential is understood but rejected by IU policy
- `422`: unsupported or malformed for this module
- `401`: bad bearer auth
- `503`: dependency failure such as RPC or chain read failure

All non-`2xx` responses fail closed from `walt.id`'s point of view. Operationally, `503` must still be logged and interpreted as infrastructure failure rather than business rejection.

### 3. Policy Evaluation Pipeline

The verifier-policy module should use a webhook-specific service rather than calling the existing `verifyVC()` function directly.

Why:

- `verifyVC()` is a browser-oriented full pipeline
- it bundles standard VC checks with IU-specific checks
- current `did:web` signature handling in `standardVerification.ts` is intentionally incomplete for server-side policy authority

Webhook service flow:

1. authenticate bearer token and enforce JSON content type
2. validate the body is a VC-like object
3. extract issuer and run IU issuer-trust logic when configured
4. resolve the Merkle receipt from `evidence` or legacy fields
5. verify Merkle proofs
6. verify chain anchoring and revocation status
7. map the outcome to HTTP status and a compact diagnostic body

One explicit rule:

- if `walt.id` session creation configures generic policies such as `signature`, `expiration`, or `allowed-issuer`, those remain authoritative for those checks
- this webhook should not silently compensate for missing generic policies unless that behavior is intentionally added later

### 4. Configuration

Recommended environment variables:

- `VERIFIER_POLICY_BEARER_TOKEN`
  Required shared secret for webhook auth
- `VERIFIER_POLICY_PORT`
  Optional dedicated port for the verifier-policy server
- `VERIFIER_POLICY_RPC_URL`
  Optional RPC override for chain reads
- `VERIFIER_POLICY_TRUSTED_ISSUERS`
  Optional comma-separated issuer allowlist for IU issuer trust
- `VERIFIER_POLICY_LOG_LEVEL`
  Optional operator-log verbosity control

### 5. Testing

This change should add focused automated coverage for:

- bearer auth middleware
- content-type enforcement
- controller request/response mapping
- service decision mapping for accepted, revoked, malformed, and dependency-failure cases
- Express route integration for `POST /api/verifier/policies/vc`
- regression coverage for the moved OID4VCI server module

## Expected Outcome

After this change:

- the repo still uses Express for demo purposes
- server code is organized under a reusable modular `src/server/**` layer
- `walt.id` can call a dedicated IU policy webhook
- the webhook makes a final IU-specific pass/fail decision from raw VC JSON alone
- the repo remains positioned for later migration to a more opinionated backend stack without rewriting the core verifier logic
