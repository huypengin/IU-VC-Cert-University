# Codex Agent Config Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a repo-scoped Codex instruction file and a small project-specific subagent catalog for safe multiagent work in this repository.

**Architecture:** Keep one authoritative `AGENTS.md` in the repo root for shared rules, then layer a project `.codex/config.toml` and a few narrow `.codex/agents/*.toml` specialist files. Keep the setup small, repo-specific, and easy to maintain.

**Tech Stack:** Markdown, TOML, existing repo docs, Codex project instruction discovery

---

### Task 1: Add the root instruction file

**Files:**
- Create: `AGENTS.md`

**Step 1: Write the root repo guidance**

Add sections for repository role, active code map, hard boundaries, commands, verification expectations, references, and multiagent usage.

**Step 2: Keep the file terse and repo-specific**

Avoid copying the full README. Link to existing docs instead of duplicating them.

**Step 3: Verify the file location**

Confirm the file lives at the repository root so Codex can discover it automatically.

### Task 2: Add project Codex config

**Files:**
- Create: `.codex/config.toml`

**Step 1: Set instruction fallback names**

Allow `AGENT.md` and `agent.md` as fallback names without replacing the root `AGENTS.md` convention.

**Step 2: Set conservative subagent limits**

Configure:

- `agents.max_threads = 4`
- `agents.max_depth = 1`
- `agents.job_max_runtime_seconds = 1800`

### Task 3: Add narrow project subagents

**Files:**
- Create: `.codex/agents/repo-mapper.toml`
- Create: `.codex/agents/oid4vci-specialist.toml`
- Create: `.codex/agents/vc-chain-guardian.toml`
- Create: `.codex/agents/targeted-implementer.toml`

**Step 1: Add one read-only mapping agent**

Make it responsible for locating exact code paths, docs, and test entry points before edits begin.

**Step 2: Add two read-only domain reviewers**

Split stable expertise between:

- OID4VCI and wallet pickup
- VC, chain, and verifier invariants

**Step 3: Add one scoped implementation worker**

Make it suitable for small file-owned edits after the parent agent has already decomposed the task.

### Task 4: Document the design record

**Files:**
- Create: `docs/plans/2026-03-18-codex-agent-config-design.md`
- Create: `docs/plans/2026-03-18-codex-agent-config-implementation.md`

**Step 1: Save the design rationale**

Record the chosen approach, alternatives considered, and verification plan.

**Step 2: Save this implementation plan**

Keep the plan alongside the rest of the repository planning docs for future reference.

### Task 5: Verify the result

**Files:**
- Verify: `AGENTS.md`
- Verify: `.codex/config.toml`
- Verify: `.codex/agents/*.toml`

**Step 1: Confirm the worktree installs and builds**

Run: `npm install`

Expected: install completes without dependency errors.

Run: `npm run build`

Expected: TypeScript and Vite build succeed.

**Step 2: Inspect the diff**

Run: `git status --short`

Expected: only the intended instruction and plan files appear as new changes.
