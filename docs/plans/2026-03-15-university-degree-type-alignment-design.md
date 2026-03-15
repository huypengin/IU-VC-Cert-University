# University Degree Type Alignment Design

## Goal

Align this issuer repository with the registry's canonical degree credential type contract so newly issued credentials and wallet metadata advertise the same degree types.

## Approved Type Contract

Degree credentials in this repository must use this canonical degree type set:

```json
[
  "VerifiableCredential",
  "UniversityDegree",
  "EducationalOccupationalCredential",
  "VNEduDegreeCredential"
]
```

IU SmartCert credentials keep `IUSmartCertCredential` in addition to that degree type set.

Example SmartCert type array:

```json
[
  "VerifiableCredential",
  "UniversityDegree",
  "EducationalOccupationalCredential",
  "VNEduDegreeCredential",
  "IUSmartCertCredential"
]
```

## Scope

- Update the canonical issued VC type array in the JSON-LD issuance path.
- Update OID4VCI issuer metadata so wallet-discoverable types stay aligned.
- Update local schema/examples/tests that still encode the older type contract.

## Non-Goals

- Redesign credential semantics beyond the type array.
- Change credential IDs, schema URLs, or status handling.
- Change wallet offer formats or token exchange behavior.

## Verification

- Targeted tests for VC assembly and OID4VCI issuer metadata must assert the new type set.
- Existing pickup/JWT tests that hardcode type arrays must be updated to remain consistent with the registry contract.
