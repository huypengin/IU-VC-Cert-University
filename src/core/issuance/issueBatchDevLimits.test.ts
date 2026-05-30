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
    {
      name: "recruiterSubmission",
      mandatory: false,
      componentType: "recruiterSubmissionPaper",
      content: `recruiter-${index}`,
    },
    {
      name: "extra",
      mandatory: false,
      componentType: "extraDocument",
      content: `extra-${index}`,
    },
  ].slice(0, componentCount);

  return {
    studentId: `student-${index}`,
    subjectDid: `did:example:student-${index}`,
    credentialId: `urn:uuid:${index}`,
    degree: { type: "BachelorDegree", name: "BSc" },
    components,
  };
}

test("issueBatch allows one student when dev batch validation is enabled", async () => {
  const result = await issueBatch(
    {
      chainId: "eip155:11155111",
      rpcUrl: "",
      validFrom: "2026-03-12T00:00:00Z",
      students: [createStudent(1, 3)],
      devBatchLimits: true,
    } as any,
    fakeDeps as any,
  );

  assert.equal(result.batch.studentCount, 1);
  assert.equal(result.batch.componentCount, 3);
});

test("issueBatch allows a submitted student with only one paper credential", async () => {
  const result = await issueBatch(
    {
      chainId: "eip155:11155111",
      rpcUrl: "",
      validFrom: "2026-03-12T00:00:00Z",
      students: [createStudent(1, 1)],
      devBatchLimits: true,
    } as any,
    fakeDeps as any,
  );

  assert.equal(result.batch.studentCount, 1);
  assert.equal(result.batch.componentCount, 1);
});

test("issueBatch allows many students when dev batch validation is enabled", async () => {
  const result = await issueBatch(
    {
      chainId: "eip155:11155111",
      rpcUrl: "",
      validFrom: "2026-03-12T00:00:00Z",
      students: [1, 2, 3, 4, 5].map((index) => createStudent(index, 3)),
      devBatchLimits: true,
    } as any,
    fakeDeps as any,
  );

  assert.equal(result.batch.studentCount, 5);
  assert.equal(result.batch.componentCount, 15);
});
