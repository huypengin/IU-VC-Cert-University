# OID4VCI Registry ES256 Alignment Design

## Goal

Make OID4VCI-issued JWT VCs fully align with the registry DID document for the issuer, using the same ES256 key material and the same verification method identifier.

## Context

- The registry now publishes issuer DID documents at paths like `/issuers/principle/did.json`.
- The example DID document exposes a `JsonWebKey2020` verification method with:
  - `type: "JsonWebKey2020"`
  - `publicKeyJwk.kty: "EC"`
  - `publicKeyJwk.crv: "P-256"`
  - `publicKeyJwk.alg: "ES256"`
  - `id: "did:web:...:issuers:principle#key-1"`
- Current OID4VCI code already supports multiple JWT algorithms, but it also has fallback paths that can produce headers which drift from the registry DID document.

## Chosen Approach

Use `OID4VCI_PRIVATE_JWK` as the source of truth for registry-backed issuance.

- The private JWK must be the ES256 private key corresponding to the registry public key.
- The JWK `kid` must already be the DID verification method identifier, for example `did:web:infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle#key-1`.
- JWT signing should preserve that `kid` exactly and emit `alg: "ES256"`.

This keeps JWT issuance and DID resolution anchored to the same key material instead of reconstructing identifiers from partial environment state.

## Architecture

### Key initialization

- `src/oid4vci/keys.ts` remains the central place for JWT signing key initialization.
- When `OID4VCI_PRIVATE_JWK` is present:
  - infer the signing algorithm from the JWK
  - import the JWK using that algorithm
  - preserve its `kid` unchanged
  - expose the matching public JWK in JWKS

### JWT issuance

- `src/oid4vci/oid4vci.service.ts` should continue to obtain `alg`, `kid`, and signing key from `keys.ts`.
- The resulting JWT protected header must match the DID document:
  - `alg: "ES256"`
  - `kid: "did:web:...#key-1"`

### Issuer metadata

- `src/oid4vci/oid4vci.controller.ts` should advertise the active signing algorithm in `credential_signing_alg_values_supported`.
- For the registry-backed ES256 configuration, metadata should therefore expose `["ES256"]`.

## Failure Handling

- If `OID4VCI_PRIVATE_JWK` is provided but is not usable for ES256 registry-backed issuance, startup should fail clearly.
- The system should not silently emit JWTs using a different key shape or a mismatched `kid` when the registry-backed key is explicitly configured.

## Testing Strategy

- Add a focused test proving that an ES256 `OID4VCI_PRIVATE_JWK` with `kid: did:web:...#key-1` produces JWTs with the exact same protected header values.
- Add or update issuer metadata coverage so the same configuration advertises `["ES256"]`.
- Keep the scope limited to header and metadata alignment; no broader OID4VCI flow rewrite is needed.

## Non-Goals

- No change to VC payload claims beyond signing metadata.
- No change to DID document generation in this task.
- No synthetic `kid` rewriting from `ISSUER_DID`; registry alignment should come from the configured JWK.
