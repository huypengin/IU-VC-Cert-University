import test from "node:test";
import assert from "node:assert/strict";

import RootAbi from "../../contracts/abi/Root.json";
import { revokeCredentialOnChain } from "./revocation.js";

const REVOCATION_KEY = `0x${"11".repeat(32)}`;

test("Root ABI includes revokeCertificate(bytes32,string)", () => {
  assert.ok(
    (RootAbi as Array<{ name?: string }>).some((entry) => entry.name === "revokeCertificate"),
  );
});

test("revokeCredentialOnChain calls revokeCertificate with the revocation key and reason", async () => {
  const requestCalls: string[] = [];
  const contractCalls: Array<{ revocationKey: string; reason: string }> = [];

  const result = await revokeCredentialOnChain(
    {
      chainId: "eip155:11155111",
      contractAddress: "0x123",
      revocationKey: REVOCATION_KEY,
      reason: "issuer revoked",
    },
    {
      injectedProvider: {
        async request({ method }: { method: string }) {
          requestCalls.push(method);
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
        revokeCertificate(revocationKey: string, reason: string) {
          contractCalls.push({ revocationKey, reason });
          return Promise.resolve({ hash: "0xdeadbeef" });
        }
      } as any,
    },
  );

  assert.deepEqual(requestCalls, ["eth_requestAccounts"]);
  assert.deepEqual(contractCalls, [{ revocationKey: REVOCATION_KEY, reason: "issuer revoked" }]);
  assert.equal(result.revokeTx, "0xdeadbeef");
  assert.equal(result.revocationKey, REVOCATION_KEY);
});

test("revokeCredentialOnChain fails on chainId mismatch", async () => {
  await assert.rejects(
    () =>
      revokeCredentialOnChain(
        {
          chainId: "eip155:11155111",
          contractAddress: "0x123",
          revocationKey: REVOCATION_KEY,
          reason: "issuer revoked",
        },
        {
          injectedProvider: {
            async request() {
              return ["0xabc"];
            },
          },
          BrowserProviderCtor: class {
            async getNetwork() {
              return { chainId: 1n };
            }

            async getSigner() {
              return { address: "0xabc" };
            }
          } as any,
          ContractCtor: class {} as any,
        },
      ),
    /chainId mismatch/i,
  );
});
