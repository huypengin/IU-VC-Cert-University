import test from "node:test";
import assert from "node:assert/strict";

import * as core from "../index.js";

test("issueBatch deploys once anchors once and returns one VC per student", async () => {
  const issueBatch = (core as any).issueBatch;

  assert.equal(typeof issueBatch, "function");

  let deployCalls = 0;
  let anchorCalls = 0;
  let assembleCalls = 0;
  let signCalls = 0;

  const result = await issueBatch(
    {
      chainId: "eip155:11155111",
      rpcUrl: "",
      validFrom: "2026-03-12T00:00:00Z",
      students: [
        {
          studentId: "student-001",
          subjectDid: "did:example:student-001",
          credentialId: "urn:uuid:001",
          degree: { type: "BachelorDegree", name: "BSc" },
          components: [
            {
              name: "diploma",
              mandatory: true,
              componentType: "degreeCertificate",
              content: "diploma-001",
            },
            {
              name: "transcript",
              mandatory: false,
              componentType: "academicTranscript",
              content: "transcript-001",
            },
          ],
        },
        {
          studentId: "student-002",
          subjectDid: "did:example:student-002",
          credentialId: "urn:uuid:002",
          degree: { type: "BachelorDegree", name: "BSc" },
          components: [
            {
              name: "diploma",
              mandatory: true,
              componentType: "degreeCertificate",
              content: "diploma-002",
            },
            {
              name: "transcript",
              mandatory: false,
              componentType: "academicTranscript",
              content: "transcript-002",
            },
          ],
        },
      ],
    },
    {
      deployBatchContract: async () => {
        deployCalls += 1;
        return {
          deploymentTx: "0xdeploy",
          contractAddress: "0x1234567890123456789012345678901234567890",
          chainId: "eip155:11155111",
        };
      },
      anchorBatchRootOnce: async () => {
        anchorCalls += 1;
        return {
          anchorTx: "0xanchor",
          contractAddress: "0x1234567890123456789012345678901234567890",
          chainId: "eip155:11155111",
        };
      },
      assembleVc: (input: any) => {
        assembleCalls += 1;
        return {
          id: input.credentialId,
          issuer: "did:example:issuer",
          validFrom: input.validFrom,
          type: ["VerifiableCredential"],
          credentialSubject: { id: input.subjectDid },
          "iu:merkleReceipt": {
            contractAddress: input.merkle.contractAddress,
            merkleRoot: input.merkle.merkleRoot,
            deploymentTx: input.merkle.deploymentTx,
            anchorTx: input.merkle.anchorTx,
            componentsProofs: [],
          },
        };
      },
      signVc: async (vc: any) => {
        signCalls += 1;
        return {
          ...vc,
          proof: { type: "DataIntegrityProof" },
        };
      },
    },
  );

  assert.equal(deployCalls, 1);
  assert.equal(anchorCalls, 1);
  assert.equal(assembleCalls, 2);
  assert.equal(signCalls, 2);
  assert.equal(result.batch.componentCount, 4);
  assert.equal(result.students.length, 2);
  assert.equal(
    result.students[0].vc["iu:merkleReceipt"].contractAddress,
    result.students[1].vc["iu:merkleReceipt"].contractAddress,
  );
});
