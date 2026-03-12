import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import * as core from "../index.js";

test("AnchorRegistryBatch artifact exists with abi and bytecode", () => {
  const artifactPath = new URL("../../contracts/abi/AnchorRegistryBatch.json", import.meta.url);

  assert.equal(existsSync(artifactPath), true);

  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
    abi?: unknown[];
    bytecode?: string;
  };

  assert.ok(Array.isArray(artifact.abi));
  assert.match(artifact.bytecode ?? "", /^0x[0-9a-f]+$/i);
});

test("deployBatchContract returns deployment metadata for a new contract instance", async () => {
  const deployBatchContract = (core as any).deployBatchContract;

  assert.equal(typeof deployBatchContract, "function");

  const result = await deployBatchContract(
    {
      chainId: "eip155:11155111",
      rpcUrl: "",
      merkleRoot: `0x${"aa".repeat(32)}`,
    },
    {
      injectedProvider: {
        async request() {
          return ["0xabc"];
        },
      },
      artifact: {
        abi: [],
        bytecode: "0x6000",
      },
      BrowserProviderCtor: class {
        async getNetwork() {
          return { chainId: 11155111n };
        }

        async getSigner() {
          return { address: "0xabc" };
        }
      } as any,
      ContractFactoryCtor: class {
        async deploy() {
          return {
            deploymentTransaction() {
              return { hash: "0xdeploy" };
            },
            async waitForDeployment() {
              return undefined;
            },
            async getAddress() {
              return "0x1234567890123456789012345678901234567890";
            },
          };
        }
      } as any,
    },
  );

  assert.equal(result.chainId, "eip155:11155111");
  assert.equal(result.deploymentTx, "0xdeploy");
  assert.equal(result.contractAddress, "0x1234567890123456789012345678901234567890");
});

test("anchorBatchRootOnce rejects when the contract is already anchored", async () => {
  const anchorBatchRootOnce = (core as any).anchorBatchRootOnce;

  assert.equal(typeof anchorBatchRootOnce, "function");

  await assert.rejects(
    () =>
      anchorBatchRootOnce(
        {
          chainId: "eip155:11155111",
          rpcUrl: "",
          contractAddress: "0x1234567890123456789012345678901234567890",
          merkleRoot: `0x${"aa".repeat(32)}`,
        },
        {
          injectedProvider: {
            async request() {
              return ["0xabc"];
            },
          },
          BrowserProviderCtor: class {
            async getNetwork() {
              return { chainId: 11155111n };
            }

            async getSigner() {
              return { address: "0xabc" };
            }
          } as any,
          ContractCtor: class {
            async MTRoot() {
              return `0x${"11".repeat(32)}`;
            }
          } as any,
        },
      ),
    /already anchored/i,
  );
});
