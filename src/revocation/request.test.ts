import test from "node:test";
import assert from "node:assert/strict";

import { buildRevocationRequestFromVc } from "./request.js";

const REVOCATION_KEY = `0x${"11".repeat(32)}`;

test("buildRevocationRequestFromVc extracts chain contract and first mandatory revocation key", async () => {
  const result = await buildRevocationRequestFromVc({
    evidence: [
      {
        type: ["IUSmartCertMerkleReceipt"],
        chainId: "eip155:11155111",
        contractAddress: "0x123",
        merkleRoot: `0x${"22".repeat(32)}`,
        anchorTx: `0x${"33".repeat(32)}`,
        leafEncoding: "credentialID||componentType||content",
        merkleTreeSpec: {
          leafHashAlg: "sha256",
          nodeHashAlg: "keccak256",
          sortPairs: true,
          sortLeaves: true,
        },
        componentsProofs: [
          { name: "transcript", mandatory: false, hash: "0x02", proof: [] },
          { name: "diploma", mandatory: true, hash: REVOCATION_KEY, proof: [] },
        ],
      },
    ],
  });

  assert.deepEqual(result, {
    chainId: "eip155:11155111",
    contractAddress: "0x123",
    revocationKey: REVOCATION_KEY,
  });
});

test("buildRevocationRequestFromVc rejects a VC without a mandatory component proof", async () => {
  await assert.rejects(
    () =>
      buildRevocationRequestFromVc({
        evidence: [
          {
            type: ["IUSmartCertMerkleReceipt"],
            chainId: "eip155:11155111",
            contractAddress: "0x123",
            merkleRoot: `0x${"22".repeat(32)}`,
            anchorTx: `0x${"33".repeat(32)}`,
            leafEncoding: "credentialID||componentType||content",
            merkleTreeSpec: {
              leafHashAlg: "sha256",
              nodeHashAlg: "keccak256",
              sortPairs: true,
              sortLeaves: true,
            },
            componentsProofs: [{ name: "transcript", mandatory: false, hash: "0x02", proof: [] }],
          },
        ],
      }),
    /mandatory component/i,
  );
});
