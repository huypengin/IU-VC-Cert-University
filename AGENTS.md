# AGENTS.md

## Repository Role

This repository is the main IU SmartCert VC workspace. It owns the browser issuer and verifier app plus the local OID4VCI issuer server used for wallet pickup.

Treat this repo as the coordinator for work done here. If a task depends on registry hosting, deployed infrastructure, smart-contract release automation, or another checkout, do not invent changes outside this repository. State the dependency and hand off the follow-up to the owning repo.

## Active Code Map

- `src/ui/**`: React UI for issuance, verification, and wallet pickup.
- `src/oid4vci/**`: Express issuer server, metadata, JWKS, offer and token flow, JWT VC issuance, and ngrok helper.
- `src/core/**`: pure issuance logic, Merkle batching, and chain helpers.
- `src/vc/**`: VC assembly and DataIntegrityProof signing.
- `src/verifier/**` and `src/revocation/**`: verification and revocation logic.
- `src/contracts/abi/**`: runtime ABI and artifact inputs used by the app.
- `src/contracts/solidity/**`: legacy Solidity reference only; not compiled by this repo.
- `src/legacy/**`: old CRA app; leave it alone unless the task explicitly targets legacy behavior.

## Hard Boundaries

- Keep `src/core/**` and `src/vc/**` independent from `src/ui/**`.
- Do not treat `dist/`, `VC.result/`, or `.env` as sources of truth.
- `.env` values are bundled into the browser build. Never commit secrets or real production keys.
- This repo is intentionally a single-package app. Avoid monorepo assumptions.

## Commands

- Install dependencies: `npm install`
- Run the UI: `npm run dev`
- Run the local OID4VCI issuer: `npm run oid4vci`
- Run the OID4VCI issuer with ngrok: `npm run oid4vci:tunnel`
- Typecheck: `npm run typecheck`
- Production build: `npm run build`
- Lint placeholder: `npm run lint` prints a placeholder only; it is not a real quality gate.
- Focused tests: `npx tsx --test path/to/test.ts ...`

## Verification Expectations

- For TypeScript or logic changes, run `npm run typecheck` plus the narrowest relevant `npx tsx --test ...` files.
- Run `npm run build` when UI rendering, env wiring, bundling, or public-browser behavior changed.
- Prefer focused verification over broad sweeps; this repo does not define a single `npm test` command.
- When you change documented behavior or operator workflow, update the relevant file under `docs/`.

## Key References

- `README.md`: setup, env vars, and operator flow.
- `docs/issuer-architecture.md`: current architecture and ownership boundaries.
- `docs/oid4vci-wallet-demo.md`: wallet pickup runbook.
- `docs/verification-logic.md` and `docs/troubleshooting-chain-verification.md`: verifier expectations and failure modes.

## Multiagent Use

- The parent agent owns planning, task decomposition, integration, and final verification.
- Spawn read-only explorers first when the task is unclear or spans multiple areas.
- Use implementation workers only after the affected files are known.
- Give workers disjoint ownership sets. Good splits in this repo are:
  - `src/ui/**`
  - `src/oid4vci/**`
  - `src/core/**`, `src/vc/**`, `src/verifier/**`, `src/revocation/**`
  - docs-only edits under `docs/**`
- Do not run parallel workers on the same feature slice or the same files.
- If the task really belongs in another repository, stop at the handoff boundary. Each repository should carry its own `AGENTS.md` and `.codex/agents/`; this repo cannot configure another checkout.

## Project Subagents

This repo includes project-scoped subagents under `.codex/agents/` for:

- code and path mapping
- OID4VCI-specific review
- VC, chain, and verifier invariant review
- small, scoped implementation once ownership is clear

Use them as helpers, not as a substitute for parent-agent verification.
