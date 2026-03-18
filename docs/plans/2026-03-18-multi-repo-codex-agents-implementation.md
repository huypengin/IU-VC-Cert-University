# Multi-Repo Codex Agents Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configure the controller, registry, and reference repos with repo-specific Codex instructions that enforce the intended cross-repo workflow.

**Architecture:** Put one root `AGENTS.md` in each repo so Codex discovers the local rules from the checkout it is currently using. Keep the controller repo richer by adding custom subagents for registry routing and walt.id protocol research, while the target repos get light project config and one narrow custom subagent each.

**Tech Stack:** Markdown, TOML, existing repo docs, Codex project instruction discovery

---

### Task 1: Update the controller repo instructions

**Files:**
- Modify: `AGENTS.md`
- Create: `.codex/agents/registry-sync-specialist.toml`
- Create: `.codex/agents/waltid-reference-researcher.toml`

**Step 1: Add the cross-repo map**

State that:

- `IU-cert-university` coordinates work
- `IU-VC-registry` owns registry and schema authority
- `waltid-identity` is read-only by default

**Step 2: Add controller-side subagents**

Create one read-only specialist for registry authority and sync flow, and one read-only specialist for walt.id protocol research.

### Task 2: Add registry repo instructions

**Files:**
- Create: `AGENTS.md`
- Create: `.codex/config.toml`
- Create: `.codex/agents/university-sync-guardian.toml`

**Step 1: Define registry ownership**

Document the canonical files, build and validation commands, and the sync relationship with `IU-cert-university`.

**Step 2: Add lightweight Codex config**

Configure fallback instruction filenames and conservative agent limits.

**Step 3: Add one narrow custom subagent**

Create a read-only subagent focused on canonical registry files and the university sync workflow.

### Task 3: Add wallet/reference repo instructions

**Files:**
- Create: `AGENTS.md`
- Create: `.codex/config.toml`
- Create: `.codex/agents/protocol-reference-scout.toml`

**Step 1: Define read-only-by-default behavior**

State that this repo is used as a protocol and architecture reference for IU work unless the user explicitly asks to modify walt.id itself.

**Step 2: Add lightweight Codex config**

Configure fallback instruction filenames and conservative agent limits.

**Step 3: Add one narrow custom subagent**

Create a read-only subagent focused on OID4VCI, OID4VP, wallet, and verifier source locations.

### Task 4: Verify the configuration

**Files:**
- Verify: `AGENTS.md` in all three repos
- Verify: all new `.codex/**/*.toml` files

**Step 1: Parse TOML**

Run a local TOML parse across the newly added config files.

**Step 2: Inspect git status**

Confirm only the intended instruction and config files changed in each worktree.
