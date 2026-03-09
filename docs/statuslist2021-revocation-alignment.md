# StatusList2021 Revocation Alignment for IU-VC-registry and IU-cert-university

## Abstract

This document defines the revocation-alignment model adopted for the `IU-VC-registry` and `IU-cert-university` repositories. The objective of the alignment is to standardize wallet-facing revocation on a single `StatusList2021` contract while preserving the operational requirement that revocation state must remain mutable at a stable public URL. The resulting design treats `StatusList2021Entry` as the canonical wallet-facing status mechanism, constrains the published status-list credential to a VC-v2-oriented shape, and separates authored reference assets from the runtime-backed source of truth used for live revocation updates.

## 1. Problem Statement

Prior to alignment, the two repositories exhibited contract drift in four material respects. First, `credentialStatus` was not modeled consistently across runtime code, schemas, examples, and checked-in public payloads. Second, the public status-list URL alternated between a bare path form and a `status-list.json` document form. Third, the published status-list credential differed between seeded examples and runtime generation, particularly with respect to `issuanceDate` versus `validFrom` and the choice of JSON-LD contexts. Fourth, deployment guidance risked implying that static asset publication alone was sufficient for wallet-visible revocation, despite the fact that revocation requires mutable content at a stable status-list URL.

These discrepancies are significant because wallet interoperability depends on a predictable `credentialStatus` contract, whereas operational revocation depends on the ability to update the status list without reissuing credentials or changing the public status-list identifier.

## 2. Design Objective

The alignment adopts a narrow design objective: the system must expose one wallet-facing revocation contract end to end, and that contract must remain operational under live updates. The chosen mechanism is `StatusList2021`, retained for wallet compatibility and limited to the revocation purpose. No change is introduced to the IU-specific Merkle anchoring or smart-contract audit model; those mechanisms remain available as institution-specific verification data rather than the primary wallet-facing revocation channel.

## 3. Canonical Contract

### 3.1 Wallet-facing status entry

The canonical `credentialStatus` object is a `StatusList2021Entry` with the following required semantics:

```json
{
  "type": "StatusList2021Entry",
  "statusPurpose": "revocation",
  "statusListIndex": "42",
  "statusListCredential": "https://<registry-host>/status/<category>/<year>/status-list.json"
}
```

The field `credentialStatus.id` is optional in schemas and TypeScript types. When present, it is derived deterministically as:

```text
${statusListCredential}#${statusListIndex}
```

This policy reflects the operational lookup model, in which revocation state is resolved from the pair `(statusListCredential, statusListIndex)` rather than from an independently managed entry identifier.

### 3.2 Canonical status-list credential

The canonical published status-list credential conforms to the following shape:

- `@context`: VC v2 context, official StatusList2021 context, and Data Integrity context as required by the current document-loading path
- `id`: `https://<registry-host>/status/<category>/<year>/status-list.json`
- `type`: `["VerifiableCredential", "StatusList2021Credential"]`
- `issuer`: issuer DID
- `validFrom`: generation timestamp
- `credentialSubject.id`: `${id}#list`
- `credentialSubject.type`: `StatusList2021`
- `credentialSubject.statusPurpose`: `"revocation"`
- `credentialSubject.encodedList`: current compressed bitstring

The use of `validFrom` rather than `issuanceDate` aligns the status-list credential with the broader VC-v2 issuance style used elsewhere in the project, while preserving StatusList2021 semantics for wallet interoperability.

### 3.3 Canonical URL policy

The canonical wallet-facing status-list URL is:

```text
.../status/<category>/<year>/status-list.json
```

Bare path forms such as `.../status/<category>/<year>` may remain as redirect aliases, but they are not canonical and must not appear in runtime output, schemas, checked-in examples, or public sample payloads.

## 4. Source-of-Truth Model

The alignment distinguishes authored assets from operational state.

- `src/registry/credentialSchema/**`, `src/registry/contexts/**`, and `src/examples/**` remain authored sources.
- `public/**` remains generated or served output.
- `src/registry/status/**` is retained only as a seeded reference shape.
- The live source of truth for revocation state is the runtime publisher and storage layer in the registry service.

This distinction is essential. A wallet-visible revocation system is operational only when the content served at the stable `status-list.json` URL can change over time without requiring rebuild or redeploy of static assets.

## 5. Repository Responsibilities

The two repositories now play distinct but coordinated roles.

| Repository | Primary responsibility | Revocation responsibility |
| --- | --- | --- |
| `IU-VC-registry` | Canonical registry assets and status-list publication | Allocate status indexes, persist revocation state, and publish the mutable wallet-facing status-list document |
| `IU-cert-university` | Credential issuance UI and OID4VCI issuer flow | Emit canonical `StatusList2021Entry` values that point to the registry-hosted status list; optionally expose a short-lived local mirror route for testing |

Under this model, `IU-cert-university` should not be treated as the authoritative wallet-facing revocation source in production deployments. Its role is to reference the registry contract correctly and, where useful, provide a local debugging mirror with equivalent document shape.

## 6. Runtime and Deployment Implications

### 6.1 Mutable serving requirement

The central operational constraint is that revocation must be expressed by updating the content served at the same stable `status-list.json` URL. Consequently, static build-only hosting is insufficient for live revocation unless `/status/**` is backed by writable persistent storage or directly served by a dynamic API.

This requirement affects deployment interpretation in a concrete way:

- static publication of contexts, schemas, and DID documents remains acceptable;
- static publication of `/status/**` is acceptable only as a non-live seed or demonstration artifact;
- live wallet-visible revocation requires registry runtime participation or an equivalent mutable storage layer.

### 6.2 Caching policy

Status-list responses must be short-lived or revalidatable. Longer-lived immutable caching is acceptable for contexts and schemas, but not for `/status/**`. This asymmetry is deliberate: revocation information is operational state, whereas contexts and schemas are comparatively stable reference assets.

## 7. Validation Outcomes

The alignment work enforces the contract at four levels.

First, runtime allocation in the registry now produces canonical `statusListCredential` URLs ending in `/status-list.json` and derives `credentialStatus.id` only as an optional convenience field.

Second, registry-authored schemas now accept the canonical `StatusList2021Entry` shape without requiring `credentialStatus.id`, and checked-in samples are aligned with the same policy.

Third, `IU-cert-university` now emits credentials whose `credentialStatus` values reference the registry-hosted canonical status-list URL rather than an issuer-local bare path.

Fourth, checked-in public status-list payloads, registry publisher output, and issuer-side mirror responses now converge on the same VC-v2-oriented status-list credential shape using `validFrom`.

## 8. Current Limitation

One limitation remains at the cryptographic tooling layer. The present JSON-LD and Data Integrity signing stack used in the registry exhibits a compatibility problem when the official VC v2 context is combined with the official StatusList2021 context. For that reason, the current implementation prioritizes canonical wallet-facing payload shape and operational correctness over immediate signed-publication of the status-list credential. This limitation does not alter the contract described above, but it should be treated as a bounded implementation issue for future work.

## 9. Conclusion

The completed alignment establishes a single, coherent revocation contract across `IU-VC-registry` and `IU-cert-university`. The contract is standards-oriented at the wallet interface, operationally stable under live updates, and explicit about the distinction between static reference assets and mutable revocation state. The most important architectural conclusion is therefore not merely that the system uses `StatusList2021`, but that it uses `StatusList2021` through a stable, runtime-backed publication model whose canonical identifier does not change when revocation state changes.
