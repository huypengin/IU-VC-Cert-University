# Codex Multi-Agent Usage

This guide explains how to use the repo-local Codex subagents configured for `IU-cert-university`.

## Short Answer

Yes, the normal trigger pattern is to explicitly name the subagent in your prompt.

Example:

```text
Spawn `registry_sync_specialist` to decide whether this VC schema change belongs in IU-VC-registry first.
Spawn `waltid_reference_researcher` to find the most relevant walt.id files for our OID4VCI wallet pickup flow.
Wait for both, then summarize the result and recommend the next repo to change.
```

The parent Codex agent stays in control. The named subagents are helpers.

## Before You Start

Start Codex from the repo root that contains:

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/agents/*.toml`

For this repo:

```bash
cd "/Users/thanganguyen/Documents/10-19 Repo/16 Thesis/IU-cert-university"
codex
```

If you start Codex from another checkout, it will use that repo's local `AGENTS.md` instead.

## What This Repo Controls

This repo is the coordinator:

- it owns the IU app, UI, local OID4VCI server, verifier flow, and downstream adaptation
- `IU-VC-registry` is the source of truth for registry and schema surface
- `waltid-identity` is read-only protocol reference by default

So the common cross-repo rule is:

- schema or registry change: start in `IU-VC-registry`
- protocol or interoperability research: read `waltid-identity`
- IU app behavior, tests, and docs: change `IU-cert-university`

## Available Subagents

Current repo-local subagents:

- `repo_mapper`: find exact files, docs, and verification commands in this repo
- `oid4vci_specialist`: inspect OID4VCI issuer, metadata, offer, token, and wallet-pickup behavior
- `vc_chain_guardian`: inspect VC assembly, Merkle receipt, chain anchoring, verifier, and revocation invariants
- `registry_sync_specialist`: inspect `IU-VC-registry` and decide whether the change belongs there first
- `waltid_reference_researcher`: inspect `waltid-identity` as a protocol reference
- `targeted_implementer`: make a small, scoped change only after the parent agent has already chosen the file set

Repo agent limits from `.codex/config.toml`:

- maximum concurrent threads: `4`
- maximum delegation depth: `1`

## How To Trigger Them

Use plain language and explicitly name the subagent in backticks.

Good pattern:

```text
Spawn `repo_mapper` to map the files and tests involved in the wallet pickup flow.
Wait for the result, then summarize the exact files to edit.
```

Parallel pattern:

```text
Spawn `registry_sync_specialist` to check whether this change belongs in IU-VC-registry first.
Spawn `waltid_reference_researcher` to find the matching protocol behavior in waltid-identity.
Wait for both, compare the findings, then recommend the next repo to change.
```

Implementation pattern:

```text
Spawn `repo_mapper` to identify the exact files and narrowest tests for this issue.
After that, spawn `targeted_implementer` to edit only those files.
Then review the diff and run the verification commands.
```

## Recommended Prompt Templates

### 1. Cross-Repo Routing

```text
Spawn `registry_sync_specialist` to decide whether this VC schema change belongs in IU-VC-registry first.
Wait for the result, then tell me whether the first edit should happen in registry or in IU-cert-university.
```

### 2. Protocol Research

```text
Spawn `waltid_reference_researcher` to find the most relevant walt.id files for OID4VCI draft11 and draft13 wallet pickup behavior.
Wait for the result, then summarize the paths I should read first.
```

### 3. Local Code Mapping

```text
Spawn `repo_mapper` to map the files, docs, and tests involved in the verifier revocation flow.
Wait for the result and give me the exact files and commands.
```

### 4. Implementation

```text
Spawn `repo_mapper` to identify the narrow file set for this OID4VCI UI issue.
Then spawn `targeted_implementer` to edit only those files and run the narrowest relevant tests.
Review the result before making any broader changes.
```

### 5. Safety Check Before Editing

```text
Spawn `vc_chain_guardian` to check whether this change would break VC receipt, chain anchoring, or revocation invariants.
Wait for the result, then tell me the main risks before any edit starts.
```

## Cross-Repo Error Debugging

When two repos are involved, use one parent Codex session in `IU-cert-university`.

Do not open two separate Codex chats and expect them to coordinate automatically.
The parent agent is the coordinator. The subagents report back to the parent, and the parent decides:

- which repo owns the bug
- whether a second repo needs only research, or a small follow-up change
- what to verify after the fix

### What To Include In The Prompt

For the best result, always include:

- the exact UI error text
- the exact backend or terminal log lines
- which repos are involved
- the final goal: diagnose, choose owner repo, fix, and verify

### Scenario 1: UI Error + Registry Repo Logs

Use this when the browser/UI fails and you suspect the registry or schema side is involved.

```text
We have a cross-repo failure.

Repos involved:
- IU-cert-university: UI/app repo
- IU-VC-registry: registry/source-of-truth repo

Symptom:
- UI error: "<paste exact browser error>"
- The registry logs are below

Task:
1. Spawn `repo_mapper` to locate the IU files and narrow tests related to this error.
2. Spawn `registry_sync_specialist` to inspect whether the failure points to a registry/schema/sync problem.
3. Compare the UI error and registry logs.
4. Identify the root cause and decide which repo owns the fix.
5. Fix only the owning repo first.
6. If a downstream adaptation is needed in the other repo, make the smallest follow-up change.
7. Run the narrowest relevant verification commands.
8. Summarize the root cause, changed files, and verification results.

Registry logs:
<paste logs>
```

Expected behavior:

- the parent agent does the routing
- schema and registry ownership should be checked before any IU-side copy is edited
- if the issue is canonical, the first fix should happen in `IU-VC-registry`

### Scenario 2: UI Error + Protocol Mismatch

Use this when the app behaves differently from wallet or protocol expectations.

```text
We have a protocol/interoperability failure.

Repos involved:
- IU-cert-university: app repo
- waltid-identity: reference repo only

Symptom:
- UI error: "<paste exact browser error>"
- Local issuer/server log: "<paste exact log>"

Task:
1. Spawn `oid4vci_specialist` to inspect the local OID4VCI flow in IU-cert-university.
2. Spawn `waltid_reference_researcher` to find the matching protocol behavior and reference files in waltid-identity.
3. Compare both findings and identify whether our implementation is wrong, our config is wrong, or the issue is only a reference mismatch.
4. Fix only IU-cert-university unless I explicitly ask to modify waltid-identity.
5. Run the narrowest relevant IU verification commands.
6. Summarize the root cause, changed files, and verification results.
```

Expected behavior:

- `waltid-identity` is used as a read-only reference
- the fix normally stays in `IU-cert-university`

### Scenario 3: Registry Sync Drift

Use this when the registry repo and university repo appear out of sync after a schema or context change.

```text
We have possible sync drift between IU-VC-registry and IU-cert-university.

Symptom:
- The university repo is failing with: "<paste error>"
- I suspect the mirrored registry files or downstream copies are out of date

Task:
1. Spawn `registry_sync_specialist` to identify the canonical registry files and the expected sync commands.
2. Spawn `repo_mapper` to identify the mirrored files and downstream IU files that depend on them.
3. Decide whether this is:
   - canonical registry drift
   - missed deterministic sync
   - downstream IU adaptation drift
4. Fix the minimal correct layer in the right order.
5. Run the narrowest verification commands and summarize the outcome.
```

### Scenario 4: Explore First, Then Fix

Use this when the failure spans UI, issuer flow, and chain or verifier logic.

```text
We have a cross-cutting bug.

Symptom:
- UI error: "<paste error>"
- Server or terminal log: "<paste log>"

Task:
1. Spawn `repo_mapper` to locate the exact files, docs, and tests involved.
2. Spawn `vc_chain_guardian` to assess whether verifier, chain, receipt, or revocation invariants are involved.
3. If registry ownership is possible, also spawn `registry_sync_specialist`.
4. Wait for all findings.
5. Choose the owner repo and the smallest safe file set.
6. If the fix belongs in IU-cert-university, spawn `targeted_implementer` to edit only that chosen file set.
7. Show the diff and the verification commands used.
```

## Research -> Match -> Implement

This is the pattern to use when one repo is mainly for research and another repo is writable.

Flow:

1. research agent finds the exact requirement in the reference repo
2. parent agent converts that into a short checklist
3. writable-side mapping agent finds where that checklist should land
4. parent agent decides the owner repo
5. writable-side implementation agent makes the smallest matching change
6. parent agent verifies

Important rule:

- research agents should not directly edit
- the parent agent carries the requirement from the research side into the writable side

### Example: Walt.id Research -> IU Implementation

```text
We need to match a requirement found in the research repo.

Task:
1. Spawn `waltid_reference_researcher` to find the exact behavior, file paths, and key requirement in `waltid-identity` for: "<describe the requirement>"
2. Wait for the result and extract the non-negotiable requirements into a short checklist.
3. Spawn `repo_mapper` to find the exact files, tests, and docs in `IU-cert-university` that should match that checklist.
4. Decide whether the requirement belongs in:
   - IU-cert-university
   - IU-VC-registry
   - or is research-only with no code change
5. If the change belongs in IU-cert-university, spawn `targeted_implementer` to edit only the mapped files so they match the requirement.
6. Run the narrowest verification commands.
7. Summarize:
   - key finding from waltid-identity
   - mapped files in IU-cert-university
   - what changed
   - verification results
```

### Example: Exact Key Or Field Matching

Use this when you already know the key or field you care about.

```text
Spawn `waltid_reference_researcher` to find how `kid`, signing algorithm, and issuer metadata are expected to behave for OID4VCI in waltid-identity.
Wait for the result and extract the exact requirements.
Then spawn `repo_mapper` to find where IU-cert-university handles `kid`, issuer metadata, and JWT signing.
If changes are needed, spawn `targeted_implementer` to update only those files and run the narrowest relevant tests.
```

## Frontend <-> Backend Repo Pattern

This is the most common multi-repo pattern.

Typical flow:

1. frontend repo shows the UI error or broken request/response handling
2. backend repo logs show the API, schema, validation, or auth failure
3. parent agent compares both sides
4. parent agent decides whether the fix belongs in FE, BE, or both in sequence

### FE/BE Contract Debug Prompt

```text
We have a frontend/backend contract failure.

Repos involved:
- Frontend repo: shows the UI error and request behavior
- Backend repo: shows the API logs and contract validation behavior

Symptom:
- UI error: "<paste exact UI error>"
- FE request payload or network detail: "<paste exact detail>"
- BE log or API error: "<paste exact log>"

Task:
1. Spawn the frontend mapping specialist to find the exact FE files, components, request builders, and tests involved.
2. Spawn the backend specialist to inspect the API contract, schema, validation, or endpoint behavior.
3. Compare FE payload expectations with BE contract expectations.
4. Decide whether the owner fix is:
   - frontend only
   - backend only
   - backend first, then frontend adaptation
5. Fix the owner repo first.
6. If the second repo needs a follow-up adjustment, keep it minimal and verify both sides.
7. Summarize the contract mismatch, changed files, and verification.
```

### FE/BE Requirement Matching Prompt

Use this when the backend or research side defines the requirement and the frontend must match it.

```text
We need the frontend repo to match a requirement from the backend or reference repo.

Task:
1. Spawn the backend or research specialist to extract the exact requirement, fields, and invariants.
2. Convert that into a short checklist.
3. Spawn the frontend mapping agent to find where the UI, request builder, state handling, and tests should match that checklist.
4. Fix the smallest frontend file set first.
5. Run the narrowest FE verification commands.
6. Report:
   - requirement source
   - checklist
   - mapped frontend files
   - changes made
   - verification results
```

## Debugging Rules

- Use one parent Codex session in the controller repo
- Paste exact UI errors and exact logs
- Route ownership before editing
- Use read-only specialists first when the owning repo is unclear
- Use `targeted_implementer` only after the parent agent has narrowed the file set
- Treat `waltid-identity` as read-only unless you explicitly ask to change it

## Smoke Tests

### Smoke Test 1: Confirm Repo Instructions Loaded

Run:

```bash
codex --ask-for-approval never "Summarize the current repo instructions and list the custom subagents available."
```

Expected result:

- Codex says this repo is the coordinator
- Codex mentions `IU-VC-registry` as schema and registry authority
- Codex mentions `waltid-identity` as read-only protocol reference
- Codex lists the subagents above

### Smoke Test 2: Confirm Parallel Research Works

Use this prompt inside Codex:

```text
Spawn `registry_sync_specialist` to decide whether changing the VC degree schema belongs in IU-VC-registry first.
Spawn `waltid_reference_researcher` to find the most relevant walt.id files for our OID4VCI wallet pickup flow.
Wait for both, then summarize the result and recommend the next repo to change.
```

Expected result:

- Codex launches both subagents
- it returns a cross-repo answer instead of guessing in one repo
- it says schema changes start in `IU-VC-registry`
- it cites `waltid-identity` reference paths without editing that repo

### Smoke Test 3: Confirm Explore Then Edit Works

Use this prompt:

```text
Spawn `repo_mapper` to locate the exact files and tests for a small Wallet Pickup copy change.
Then spawn `targeted_implementer` to edit only the chosen UI files and run the narrowest relevant checks.
Wait for both, then show me the diff and the verification commands used.
```

Expected result:

- the first subagent maps the scope
- the second subagent edits only a small file set
- the parent agent reports the diff and verification, not just a generic success claim

## Common Mistakes

- Starting Codex from the wrong repo root and expecting these subagents to exist there
- Asking for a cross-repo schema change directly in `IU-cert-university` instead of routing it to `IU-VC-registry`
- Treating `waltid-identity` as writable for IU tasks when it should stay reference-only
- Asking `targeted_implementer` to change too many files at once
- Expecting subagents to replace parent-agent review; they do not

## Practical Rules

- Name the agent explicitly in the prompt
- Keep each subagent task narrow
- Use read-only specialists first when the task is unclear
- Use `targeted_implementer` only after file ownership is clear
- For schema and registry authority, defer to `IU-VC-registry`
- For protocol confirmation, defer to `waltid-identity`

## When You Move This Doc Later

If you later want a cleaner repo surface, move this file into a hidden docs location after the workflow is stable. The operational behavior comes from `AGENTS.md` and `.codex/agents/*`, not from this guide.
