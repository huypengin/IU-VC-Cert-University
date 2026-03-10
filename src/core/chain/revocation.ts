import { BrowserProvider, Contract } from "ethers";

import RootAbi from "../../contracts/abi/Root.json";

type RevokeCredentialArgs = {
  chainId: string;
  contractAddress: string;
  revocationKey: string;
  reason: string;
};

type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type RevokeCredentialDeps = {
  injectedProvider?: InjectedProvider | null;
  BrowserProviderCtor?: typeof BrowserProvider;
  ContractCtor?: typeof Contract;
};

function getInjectedProvider(): InjectedProvider | null {
  const eth = (globalThis as any).ethereum as InjectedProvider | undefined;
  return eth?.request ? eth : null;
}

export async function revokeCredentialOnChain(
  args: RevokeCredentialArgs,
  deps: RevokeCredentialDeps = {},
): Promise<{
  revokeTx: string;
  contractAddress: string;
  chainId: string;
  revocationKey: string;
  reason: string;
}> {
  const { chainId, contractAddress, revocationKey, reason } = args;

  if (!contractAddress) throw new Error("revokeCredentialOnChain: contractAddress is required");
  if (!revocationKey) throw new Error("revokeCredentialOnChain: revocationKey is required");
  if (!reason.trim()) throw new Error("revokeCredentialOnChain: reason is required");

  const injected = deps.injectedProvider ?? getInjectedProvider();
  if (!injected) {
    throw new Error("revokeCredentialOnChain: MetaMask (EIP-1193 provider) not found.");
  }

  await injected.request({ method: "eth_requestAccounts" });

  const BrowserProviderImpl = deps.BrowserProviderCtor ?? BrowserProvider;
  const ContractImpl = deps.ContractCtor ?? Contract;

  const provider = new BrowserProviderImpl(injected as any);
  const network = await provider.getNetwork();
  const providerChainId = `eip155:${network.chainId.toString()}`;

  if (chainId && chainId !== providerChainId) {
    throw new Error(`revokeCredentialOnChain: chainId mismatch. UI=${chainId} MetaMask=${providerChainId}`);
  }

  const signer = await provider.getSigner();
  const contract = new ContractImpl(contractAddress, RootAbi as any, signer) as any;

  if (typeof contract.revokeCertificate !== "function") {
    throw new Error("revokeCredentialOnChain: ABI does not include revokeCertificate(bytes32,string)");
  }

  const tx = await contract.revokeCertificate(revocationKey, reason);
  return {
    revokeTx: tx.hash,
    contractAddress,
    chainId: providerChainId,
    revocationKey,
    reason,
  };
}
