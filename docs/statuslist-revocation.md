# StatusList2021 Revocation

This repository now exposes a wallet-facing revocation path based on `StatusList2021`.

## What It Does

- generated credentials include `credentialStatus.type = StatusList2021Entry`
- the issuer serves `GET /status/degree/2026`
- wallet-compatible revocation is separated from the IU-specific Merkle and smart-contract verification flow

## Why This Exists

Wallets such as Sphereon can understand standard `credentialStatus` formats, but should not be expected to execute IU-specific smart-contract revocation logic. Temporal labels such as `valid` or `never expired` are not the same as revocation.

## Current Demo Model

- `statusListIndex` is derived deterministically from `credentialId`
- the status list document can mark revoked credentials by:
  - explicit numeric indexes via `STATUS_LIST_REVOKED_INDEXES`
  - credential IDs via `STATUS_LIST_REVOKED_CREDENTIAL_IDS`
- the smart-contract revocation model remains available as secondary IU-controlled verification data

## Configuration

- `STATUS_LIST_PATH`
  - default: `/status/degree/2026`
- `STATUS_LIST_REVOKED_INDEXES`
  - example: `2,9,42`
- `STATUS_LIST_REVOKED_CREDENTIAL_IDS`
  - example: `urn:uuid:example-degree-2025,urn:uuid:revoked-degree-2026`

## Operational Notes

- the current deterministic `credentialId -> statusListIndex` mapping is good enough for demo interoperability, but not a substitute for a production-grade persistent allocation system
- if you regenerate the same credential ID, you get the same status index
- if you change the credential ID, you change the status index
