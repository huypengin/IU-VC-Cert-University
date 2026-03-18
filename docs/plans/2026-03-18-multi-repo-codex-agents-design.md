# Multi-Repo Codex Agents Design

## Problem

The user wants to use Codex across three related repositories with different responsibilities:

- `IU-cert-university` as the coordinator and product repo
- `IU-VC-registry` as the writable source of truth for registry and schema changes
- `waltid-identity` as a read-only protocol reference for wallet and verifier behavior

Without explicit repo-scoped instructions, Codex can choose the wrong repo for a change, duplicate schema edits across repos, or treat the large `waltid-identity` checkout as a general implementation target.

## Goals

- make each repo declare its own role clearly
- keep `IU-cert-university` as the orchestrator, not the schema authority
- make `IU-VC-registry` the canonical starting point for registry and schema changes
- keep `waltid-identity` read-only by default and optimized for protocol research
- add just enough project config for Codex to behave predictably across repos

## Non-Goals

- one master instruction file that controls every repo
- automatic cross-repo mutation from a single prompt
- broad custom agent catalogs in every repo

## Approaches Considered

### 1. Controller-only instructions

Pros:

- minimal file count

Cons:

- target repos still lack local rules when opened directly
- cross-repo ownership remains implicit

### 2. Repo-scoped instructions in all three repos

Pros:

- each checkout states its own authority and limits
- Codex behaves correctly whether invoked from the controller repo or directly inside a target repo
- easier to evolve as each repo changes

Cons:

- more files to maintain

### 3. One global orchestration doc outside the repos

Pros:

- central place for the user

Cons:

- weak project discovery for Codex
- easy drift between orchestration notes and repo reality

## Chosen Approach

Approach 2 is the right fit.

Each repo gets its own root `AGENTS.md`. The controller repo also keeps project subagents for cross-repo routing and reference research. The registry and wallet repos get lightweight `.codex/config.toml` files plus one narrow custom subagent each.

## Repo Roles

### IU-cert-university

- coordinator repo
- downstream adaptation target after registry sync
- primary owner of UI, local OID4VCI server, verifier flow, and IU-specific app logic

### IU-VC-registry

- canonical owner of registry contexts, credential schemas, issuer DID docs, public registry assets, and sync tooling
- if VC schema or registry surface changes, update here first

### waltid-identity

- upstream protocol reference
- use for research and interoperability guidance by default
- do not edit unless the task explicitly targets walt.id itself

## Verification Plan

- confirm the new root `AGENTS.md` files exist in all three repos
- parse all new `.codex/config.toml` and custom subagent TOML files
- inspect git status in each isolated worktree to confirm the change scope
