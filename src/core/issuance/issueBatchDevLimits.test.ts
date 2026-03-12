import test from "node:test";
import assert from "node:assert/strict";

import { issueBatch } from "./issueBatch.js";

const fakeDeps = {
  deployBatchContract: async () => ({
    deploymentTx: "0xdeploy",
    contractAddress: "0x1234567890123456789012345678901234567890",
    chainId: "eip155:11155111",
  }),
  anchorBatchRootOnce: async () => ({
    anchorTx: "0xanchor",
    contractAddress: "0x1234567890123456789012345678901234567890",
    chainId: "eip155:11155111",
  }),
  assembleVc: () =>
    ({
      issuer: "did:example:issuer",
      validFrom: "2026-03-12T00:00:00Z",
      type: ["VerifiableCredential"],
      credentialSubject: {},
    }) as any,
  signVc: async (vc: any) => ({ ...vc, proof: { type: "DataIntegrityProof" } }),
};

function createStudent(index: number, componentCount = 2) {
  const components = [
    {
      name: "diploma",
      mandatory: true,
      componentType: "degreeCertificate",
      content: `diploma-${index}`,
    },
    {
      name: "transcript",
      mandatory: false,
      componentType: "academicTranscript",
      content: `transcript-${index}`,
    },
  ];

  if (componentCount > 2) {
    components.push({
      name: "extra",
      mandatory: false,
      componentType: "extraDocument",
      content: `extra-${index}`,
    });
  }

  return {
    studentId: `student-${index}`,
    subjectDid: `did:example:student-${index}`,
    credentialId: `urn:uuid:${index}`,
    degree: { type: "BachelorDegree", name: "BSc" },
    components,
  };
}

test("issueBatch rejects fewer than 3 students when dev batch validation is enabled", async () => {
  await assert.rejects(
    () =>
      issueBatch(
        {
          chainId: "eip155:11155111",
          rpcUrl: "",
          validFrom: "2026-03-12T00:00:00Z",
          students: [createStudent(1), createStudent(2)],
          devBatchLimits: true,
        } as any,
        fakeDeps as any,
      ),
    /3-4 students/i,
  );
});

test("issueBatch rejects more than 8 components when dev batch validation is enabled", async () => {
  await assert.rejects(
    () =>
      issueBatch(
        {
          chainId: "eip155:11155111",
          rpcUrl: "",
          validFrom: "2026-03-12T00:00:00Z",
          students: [createStudent(1, 3), createStudent(2, 3), createStudent(3, 3)],
          devBatchLimits: true,
        } as any,
        fakeDeps as any,
      ),
    /6-8 components/i,
  );
});
