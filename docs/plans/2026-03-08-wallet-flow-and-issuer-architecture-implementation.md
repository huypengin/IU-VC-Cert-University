# Wallet Flow And Issuer Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two detailed technical documentation pages describing the wallet verification/import flow and the issuer architecture in this repository.

**Architecture:** Write two separate Markdown documents: one protocol/runtime flow document and one codebase/runtime architecture document. Each document should use Mermaid diagrams, concrete endpoint references, and responsibility tables grounded in the current code.

**Tech Stack:** Markdown, Mermaid, existing TypeScript/Express/Vite codebase, repository docs.

---

### Task 1: Write the wallet verification and import flow doc

**Files:**
- Create: `docs/wallet-verification-import-flow.md`

**Step 1: Draft the sequence diagram**

Include actors:
- User
- UI
- Wallet
- Issuer API
- Registry DID endpoint
- Registry context/schema endpoints
- Wallet DB

**Step 2: Add the detailed flow narrative**

Document the exact flow using current endpoints:
- `GET /oid4vci/pickup-offer`
- `GET /oid4vci/credential-offer`
- `GET /.well-known/openid-credential-issuer`
- `POST /oid4vci/token`
- `POST /oid4vci/credential`
- registry `did.json`

**Step 3: Add responsibility and failure sections**

Include:
- actor responsibility table
- failure matrix
- note about wallet DB import being inferred from wallet behavior rather than repository code

**Step 4: Verify content exists**

Run:

```bash
rg -n "sequenceDiagram|pickup-offer|credential-offer|did.json|wallet DB|Failure Matrix" docs/wallet-verification-import-flow.md
```

Expected: matches for all major sections and keywords

### Task 2: Write the issuer architecture doc

**Files:**
- Create: `docs/issuer-architecture.md`

**Step 1: Draft the runtime/component diagram**

Include:
- React UI
- OID4VCI API
- VC assembly/signing path
- key management
- registry
- optional ngrok/public URL

**Step 2: Add architecture sections**

Document:
- repository layers and file ownership
- dual signing paths
- runtime request/data flow
- environment/config split

**Step 3: Verify content exists**

Run:

```bash
rg -n "flowchart|src/ui|src/core|src/vc|src/oid4vci|OID4VCI_PRIVATE_JWK|ISSUER_ED25519_PRIVATE_KEY" docs/issuer-architecture.md
```

Expected: matches for the architecture sections and config split

### Task 3: Link and verify docs

**Files:**
- Modify: `README.md`

**Step 1: Add doc references**

Add links to:
- `docs/wallet-verification-import-flow.md`
- `docs/issuer-architecture.md`

**Step 2: Verify references**

Run:

```bash
rg -n "wallet-verification-import-flow|issuer-architecture" README.md docs/wallet-verification-import-flow.md docs/issuer-architecture.md
```

Expected: matches in all intended files

**Step 3: Final verification**

Run:

```bash
npm run typecheck
```

Expected: PASS
