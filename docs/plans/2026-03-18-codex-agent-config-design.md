# Codex Agent Config Design

## Problem

The repository had no project-scoped Codex instruction file or custom subagent catalog, so future Codex sessions had to infer repo norms, verification commands, and safe delegation boundaries from scratch.

That is especially weak for multiagent work because this repo mixes React UI, an OID4VCI issuer server, VC assembly, verifier logic, and chain helpers in one package.

## Goals

- add a root `AGENTS.md` that Codex will discover automatically
- make the guidance useful for both the parent agent and spawned subagents
- define a small project-scoped subagent set under `.codex/agents/`
- keep the instructions terse and repo-specific rather than generic
- make the repo explicit about cross-repo handoff boundaries

## Non-Goals

- configure other repositories from this checkout
- replace human docs already covered well in `README.md` and `docs/**`
- build a large agent catalog with overlapping roles

## Approaches Considered

### 1. Root `AGENTS.md` only

Pros:

- simplest setup
- lowest maintenance cost

Cons:

- no named specialist subagents for repeatable delegation

### 2. Root `AGENTS.md` plus project-scoped subagents

Pros:

- shared repo rules stay centralized
- recurring delegation patterns become explicit and reusable
- parent agent can keep orchestration logic while specialists stay narrow

Cons:

- slightly higher maintenance because the subagent files must stay aligned with the codebase

### 3. Only project-scoped subagents without a strong root file

Pros:

- delegation-focused

Cons:

- weak baseline guidance for the parent agent
- higher chance of inconsistent behavior across sessions

## Chosen Approach

Approach 2 is the best fit.

The root `AGENTS.md` will carry repo-wide context, commands, verification expectations, and multiagent boundaries. Project-scoped subagents under `.codex/agents/` will cover a few stable specializations:

- repo mapping
- OID4VCI and wallet-pickup review
- VC, chain, and verifier invariant review
- small targeted implementation after ownership is clear

## File Layout

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/agents/repo-mapper.toml`
- `.codex/agents/oid4vci-specialist.toml`
- `.codex/agents/vc-chain-guardian.toml`
- `.codex/agents/targeted-implementer.toml`

## Verification Plan

- ensure the new instruction files are present and readable
- run `npm run build` to confirm the clean worktree still builds after the documentation and config additions
- inspect the git diff to verify the change is limited to the intended files
