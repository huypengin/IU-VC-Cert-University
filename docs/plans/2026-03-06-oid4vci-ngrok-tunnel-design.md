# OID4VCI Ngrok Tunnel Design

## Goal

Provide a single command to run the OID4VCI issuer API with a stable public ngrok URL so wallet metadata, token, and credential endpoints are externally reachable.

## Context

- Current flow requires manual coordination of `npm run oid4vci` and `ngrok http`.
- The issuer metadata and offer URLs depend on `BASE_URL`.
- Wallet pickup reliability improves when `BASE_URL` is stable (reserved ngrok URL).

## Proposed UX

- Keep UI startup separate (`npm run dev` stays unchanged).
- Add a new command: `npm run oid4vci:tunnel`.
- The new command:
  1. Validates required env (`NGROK_DOMAIN`, optional `NGROK_AUTHTOKEN`, `OID4VCI_PORT`).
  2. Starts issuer API with `BASE_URL=https://<NGROK_DOMAIN>`.
  3. Starts ngrok tunnel to local issuer port using `--url https://<NGROK_DOMAIN>`.
  4. Mirrors logs from both processes and shuts both down together on Ctrl+C.

## Architecture

### Runtime split

- `src/oid4vci/server.ts` remains the issuer API entrypoint.
- New wrapper entrypoint: `src/oid4vci/startWithNgrok.ts`.
- New pure config parser: `src/oid4vci/tunnelConfig.ts` (testable, no process spawning).

### URL resolution

- Canonical public issuer URL is produced from `NGROK_DOMAIN`:
  - If user passes host only, normalize to `https://<host>`.
  - If user passes full URL, preserve protocol and sanitize trailing slash.
- Wrapper injects normalized URL into issuer process as `BASE_URL`.

### Failure handling

- Missing `NGROK_DOMAIN`: fail fast with actionable message.
- Spawn failure for `ngrok` or issuer: fail fast and exit non-zero.
- Unexpected child exit: terminate sibling process and exit non-zero.
- SIGINT/SIGTERM: terminate both children cleanly.

## Testing Strategy

- Unit tests (TDD) for `tunnelConfig.ts`:
  - parses host-only domain to `https://...`
  - accepts full `https://...`
  - strips trailing slash
  - defaults to port `8787`
  - validates invalid domain input
- Integration of child-process behavior is kept minimal and manual via command runbook.

## Docs Updates

- Add usage and env section to `README.md`.
- Extend `docs/oid4vci-wallet-demo.md` with tunnel startup instructions.
- Extend `.env.example` with `NGROK_DOMAIN` and `NGROK_AUTHTOKEN`.

## Non-Goals

- No automatic UI startup.
- No automatic ngrok reserved-domain provisioning.
- No dependency on ngrok API SDK; use existing ngrok CLI installed on operator machine.
