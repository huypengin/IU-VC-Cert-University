import test from "node:test";
import assert from "node:assert/strict";

import * as core from "../index.js";

test("buildBatchMerkle groups many students into one root and returns student-scoped proofs", () => {
  const buildBatchMerkle = (core as any).buildBatchMerkle;

  assert.equal(typeof buildBatchMerkle, "function");

  const result = buildBatchMerkle({
    students: [
      {
        studentId: "student-001",
        credentialId: "urn:uuid:001",
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
        credentialId: "urn:uuid:002",
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
  });

  assert.equal(result.batch.componentCount, 4);
  assert.equal(result.students.length, 2);
  assert.equal(result.students[0].receiptComponents.length, 2);
  assert.equal(result.students[0].merkleRoot, result.students[1].merkleRoot);
});

test("buildBatchMerkle rejects duplicate student-scoped leaf keys", () => {
  const buildBatchMerkle = (core as any).buildBatchMerkle;

  assert.equal(typeof buildBatchMerkle, "function");

  assert.throws(
    () =>
      buildBatchMerkle({
        students: [
          {
            studentId: "student-001",
            credentialId: "urn:uuid:001",
            components: [
              {
                name: "diploma",
                mandatory: true,
                componentType: "degreeCertificate",
                content: "diploma-001",
              },
              {
                name: "diploma",
                mandatory: false,
                componentType: "academicTranscript",
                content: "transcript-001",
              },
            ],
          },
        ],
      }),
    /duplicate/i,
  );
});
