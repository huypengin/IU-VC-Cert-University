import test from "node:test";
import assert from "node:assert/strict";

import * as batchUi from "./batchIssuance.js";

test("formatBatchIssuance returns a small-batch summary across student outputs", () => {
  const formatBatchIssuance = (batchUi as any).formatBatchIssuance;

  assert.equal(typeof formatBatchIssuance, "function");

  const summary = formatBatchIssuance({
    batch: {
      chainId: "eip155:11155111",
      contractAddress: "0x1234567890123456789012345678901234567890",
      deploymentTx: "0xdeploy",
      anchorTx: "0xanchor",
      merkleRoot: `0x${"aa".repeat(32)}`,
      studentCount: 3,
      componentCount: 6,
    },
    students: [
      {
        studentId: "student-001",
        credentialId: "urn:uuid:001",
        vc: {
          "iu:merkleReceipt": {
            contractAddress: "0x1234567890123456789012345678901234567890",
          },
        },
      },
      {
        studentId: "student-002",
        credentialId: "urn:uuid:002",
        vc: {
          "iu:merkleReceipt": {
            contractAddress: "0x1234567890123456789012345678901234567890",
          },
        },
      },
      {
        studentId: "student-003",
        credentialId: "urn:uuid:003",
        vc: {
          "iu:merkleReceipt": {
            contractAddress: "0x1234567890123456789012345678901234567890",
          },
        },
      },
    ],
  });

  assert.equal(summary.contractAddress, "0x1234567890123456789012345678901234567890");
  assert.equal(summary.studentCount, 3);
  assert.equal(summary.componentCount, 6);
  assert.equal(summary.sizeLabel, "3 students / 6 components");
  assert.equal(summary.students[0].contractAddress, summary.students[1].contractAddress);
});
