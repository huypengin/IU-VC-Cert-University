import test from "node:test";
import assert from "node:assert/strict";
import { assembleVc } from "./assembleVc.js";

test("assembleVc includes StatusList2021Entry when status config is provided", () => {
  (globalThis as typeof globalThis & { __IU_ENV__?: Record<string, string | undefined> }).__IU_ENV__ = {
    ISSUER_DID: "did:web:issuer.example",
    SCHEMA_URL: "https://issuer.example/schemas/degree.json",
    DEGREE_CONTEXT_URL: "https://issuer.example/contexts/degree.jsonld",
    IU_SMARTCERT_CONTEXT_URL: "https://issuer.example/contexts/iu-smartcert.jsonld",
    MERKLE_CONTEXT_URL: "https://issuer.example/contexts/merkle.jsonld",
  };

  const vc = assembleVc({
    credentialId: "urn:uuid:status-test",
    validFrom: "2026-03-09T00:00:00Z",
    subjectDid: "did:example:student123",
    degree: {
      type: "BachelorDegree",
      name: "BSc in Computer Science",
    },
    components: [
      {
        name: "diploma",
        mandatory: true,
        componentType: "degreeCertificate",
        componentHash: "0xabc",
      },
    ],
    merkle: {
      chainId: "eip155:11155111",
      contractAddress: "0x123",
      merkleRoot: "0x456",
      anchorTx: "0x789",
      proofs: {
        diploma: ["0xdef"],
      },
    },
    statusList: {
      statusPurpose: "revocation",
      statusListCredential: "https://issuer.example/status/degree/2026/status-list.json",
      statusListIndex: 42,
    },
  });

  assert.deepEqual(vc.credentialStatus, {
    id: "https://issuer.example/status/degree/2026/status-list.json#42",
    type: "StatusList2021Entry",
    statusPurpose: "revocation",
    statusListCredential: "https://issuer.example/status/degree/2026/status-list.json",
    statusListIndex: "42",
  });
});
