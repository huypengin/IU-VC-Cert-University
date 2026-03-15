import test from "node:test";
import assert from "node:assert/strict";

import { assembleVc } from "./assembleVc.js";

test("assembleVc keeps shared batch metadata while embedding one student's proofs", () => {
  (globalThis as any).__IU_ENV__ = {
    ISSUER_DID: "did:example:issuer",
    SCHEMA_URL: "https://example.com/schema.json",
    DEGREE_CONTEXT_URL: "https://example.com/degree-context.jsonld",
    IU_SMARTCERT_CONTEXT_URL: "https://example.com/iu-smartcert-context.jsonld",
    MERKLE_CONTEXT_URL: "https://example.com/merkle-context.jsonld",
  };

  const vc = assembleVc({
    credentialId: "urn:uuid:001",
    validFrom: "2026-03-12T00:00:00Z",
    subjectDid: "did:example:student-001",
    degree: { type: "BachelorDegree", name: "BSc" },
    components: [
      {
        name: "diploma",
        mandatory: true,
        componentType: "degreeCertificate",
        componentHash: `0x${"11".repeat(32)}`,
      },
      {
        name: "transcript",
        mandatory: false,
        componentType: "academicTranscript",
        componentHash: `0x${"22".repeat(32)}`,
      },
    ],
    merkle: {
      chainId: "eip155:11155111",
      contractAddress: "0x1234567890123456789012345678901234567890",
      merkleRoot: `0x${"aa".repeat(32)}`,
      anchorTx: `0x${"bb".repeat(32)}`,
      deploymentTx: `0x${"cc".repeat(32)}`,
      proofs: {
        diploma: [`0x${"33".repeat(32)}`],
        transcript: [`0x${"44".repeat(32)}`],
      },
    } as any,
  } as any);

  const receipt = vc["iu:merkleReceipt"];
  assert.deepEqual(vc.type, [
    "VerifiableCredential",
    "UniversityDegree",
    "EducationalOccupationalCredential",
    "VNEduDegreeCredential",
    "IUSmartCertCredential",
  ]);
  assert.equal(receipt?.merkleRoot, `0x${"aa".repeat(32)}`);
  assert.equal(receipt?.componentsProofs.length, 2);
  assert.equal(receipt?.deploymentTx, `0x${"cc".repeat(32)}`);
});
