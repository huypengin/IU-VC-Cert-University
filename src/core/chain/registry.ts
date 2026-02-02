import { BrowserProvider, Contract } from "ethers";

import RootAbi from "../../contracts/abi/Root.json";

type AnchorRootArgs = {
  chainId: string; // eip155:...
  rpcUrl: string; // kept for UI parity (MetaMask flow does not need it)
  contractAddress: string;
  merkleRoot: string; // 0x... bytes32
};

function getInjectedProvider(): { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null {
  const eth = (globalThis as any).ethereum as any;
  return eth?.request ? eth : null;
}

export async function anchorRoot(
  args: AnchorRootArgs,
): Promise<{ anchorTx: string; contractAddress: string; chainId: string }> {
  const { chainId, contractAddress, merkleRoot } = args;

  if (!contractAddress) throw new Error("anchorRoot: contractAddress is required");
  if (!merkleRoot) throw new Error("anchorRoot: merkleRoot is required");

  const injected = getInjectedProvider();
  if (!injected) {
    throw new Error("anchorRoot: MetaMask (EIP-1193 provider) not found. Install MetaMask to anchor on-chain.");
  }

  await injected.request({ method: "eth_requestAccounts" });

  const provider = new BrowserProvider(injected as any);
  const network = await provider.getNetwork();
  const providerChainId = `eip155:${network.chainId.toString()}`;

  if (chainId && chainId !== providerChainId) {
    throw new Error(`anchorRoot: chainId mismatch. UI=${chainId} MetaMask=${providerChainId}`);
  }

  const signer = await provider.getSigner();
  const contract = new Contract(contractAddress, RootAbi as any, signer) as any;

  if (typeof contract.anchorRoot !== "function") {
    throw new Error("anchorRoot: ABI does not include anchorRoot(bytes32)");
  }

  const tx = await contract.anchorRoot(merkleRoot);
  return { anchorTx: tx.hash, contractAddress, chainId: providerChainId };
}

