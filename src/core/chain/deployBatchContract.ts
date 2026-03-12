import { BrowserProvider, Contract, ContractFactory } from "ethers";

import AnchorRegistryBatchArtifact from "../../contracts/abi/AnchorRegistryBatch.json";

type DeployBatchContractArgs = {
  chainId: string;
  rpcUrl: string;
  merkleRoot: string;
};

type AnchorBatchRootArgs = {
  chainId: string;
  rpcUrl: string;
  contractAddress: string;
  merkleRoot: string;
};

type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type ContractArtifact = {
  abi: unknown[];
  bytecode: string;
};

type DeployBatchContractDeps = {
  injectedProvider?: InjectedProvider | null;
  artifact?: ContractArtifact;
  BrowserProviderCtor?: typeof BrowserProvider;
  ContractFactoryCtor?: typeof ContractFactory;
};

type AnchorBatchRootDeps = {
  injectedProvider?: InjectedProvider | null;
  BrowserProviderCtor?: typeof BrowserProvider;
  ContractCtor?: typeof Contract;
};

const ZERO_BYTES32 = `0x${"00".repeat(32)}`;

function getInjectedProvider(): InjectedProvider | null {
  const eth = (globalThis as any).ethereum as InjectedProvider | undefined;
  return eth?.request ? eth : null;
}

function validateArtifact(artifact: ContractArtifact): ContractArtifact {
  if (!Array.isArray(artifact.abi)) {
    throw new Error("deployBatchContract: contract artifact ABI is invalid");
  }
  if (!/^0x[0-9a-f]+$/i.test(artifact.bytecode)) {
    throw new Error("deployBatchContract: contract artifact bytecode is invalid");
  }
  return artifact;
}

export async function deployBatchContract(
  args: DeployBatchContractArgs,
  deps: DeployBatchContractDeps = {},
): Promise<{ deploymentTx: string; contractAddress: string; chainId: string }> {
  const { chainId, merkleRoot } = args;

  if (!merkleRoot) {
    throw new Error("deployBatchContract: merkleRoot is required");
  }

  const injected = deps.injectedProvider ?? getInjectedProvider();
  if (!injected) {
    throw new Error("deployBatchContract: MetaMask (EIP-1193 provider) not found.");
  }

  await injected.request({ method: "eth_requestAccounts" });

  const BrowserProviderImpl = deps.BrowserProviderCtor ?? BrowserProvider;
  const ContractFactoryImpl = deps.ContractFactoryCtor ?? ContractFactory;
  const artifact = validateArtifact((deps.artifact ?? AnchorRegistryBatchArtifact) as ContractArtifact);

  const provider = new BrowserProviderImpl(injected as any);
  const network = await provider.getNetwork();
  const providerChainId = `eip155:${network.chainId.toString()}`;

  if (chainId && chainId !== providerChainId) {
    throw new Error(`deployBatchContract: chainId mismatch. UI=${chainId} MetaMask=${providerChainId}`);
  }

  const signer = await provider.getSigner();
  const factory = new ContractFactoryImpl(artifact.abi as any, artifact.bytecode, signer) as any;
  if (typeof factory.deploy !== "function") {
    throw new Error("deployBatchContract: contract factory is missing deploy()");
  }

  const contract = await factory.deploy();
  if (typeof contract.waitForDeployment === "function") {
    await contract.waitForDeployment();
  }

  const deploymentTx = contract.deploymentTransaction?.()?.hash;
  const contractAddress = await contract.getAddress();

  if (!deploymentTx) {
    throw new Error("deployBatchContract: deployment transaction hash is unavailable");
  }

  return { deploymentTx, contractAddress, chainId: providerChainId };
}

export async function anchorBatchRootOnce(
  args: AnchorBatchRootArgs,
  deps: AnchorBatchRootDeps = {},
): Promise<{ anchorTx: string; contractAddress: string; chainId: string }> {
  const { chainId, contractAddress, merkleRoot } = args;

  if (!contractAddress) {
    throw new Error("anchorBatchRootOnce: contractAddress is required");
  }
  if (!merkleRoot) {
    throw new Error("anchorBatchRootOnce: merkleRoot is required");
  }

  const injected = deps.injectedProvider ?? getInjectedProvider();
  if (!injected) {
    throw new Error("anchorBatchRootOnce: MetaMask (EIP-1193 provider) not found.");
  }

  await injected.request({ method: "eth_requestAccounts" });

  const BrowserProviderImpl = deps.BrowserProviderCtor ?? BrowserProvider;
  const ContractImpl = deps.ContractCtor ?? Contract;

  const provider = new BrowserProviderImpl(injected as any);
  const network = await provider.getNetwork();
  const providerChainId = `eip155:${network.chainId.toString()}`;

  if (chainId && chainId !== providerChainId) {
    throw new Error(`anchorBatchRootOnce: chainId mismatch. UI=${chainId} MetaMask=${providerChainId}`);
  }

  const signer = await provider.getSigner();
  const contract = new ContractImpl(
    contractAddress,
    (AnchorRegistryBatchArtifact as ContractArtifact).abi as any,
    signer,
  ) as any;

  if (typeof contract.MTRoot === "function") {
    const currentRoot = await contract.MTRoot();
    if (typeof currentRoot === "string" && currentRoot.toLowerCase() !== ZERO_BYTES32) {
      throw new Error("anchorBatchRootOnce: contract is already anchored");
    }
  }

  if (typeof contract.anchorRoot !== "function") {
    throw new Error("anchorBatchRootOnce: ABI does not include anchorRoot(bytes32)");
  }

  const tx = await contract.anchorRoot(merkleRoot);
  return { anchorTx: tx.hash, contractAddress, chainId: providerChainId };
}
