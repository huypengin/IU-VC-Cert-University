export type DataIntegrityProof = {
  type: "DataIntegrityProof" | string;
  cryptosuite: "eddsa-rdfc-2022" | string;
  proofPurpose: "assertionMethod" | string;
  created: string;
  verificationMethod: string;
  proofValue: string;
  [key: string]: unknown;
};

export type IUSmartCertMerkleReceipt = {
  type: "IUSmartCertMerkleReceipt" | string;
  chainId: string;
  contractAddress: string;
  merkleRoot: string;
  anchorTx: string;
  hashAlg: "sha256";
  leafEncoding: "credentialID||componentType||content";
  componentsProofs: Array<{
    name: string;
    mandatory: boolean;
    hash: string;
    proof: string[];
  }>;
  [key: string]: unknown;
};

export type UnsignedVc = {
  "@context": string | string[];
  type: string | string[];
  id?: string;
  issuer: string;
  validFrom: string;
  credentialSubject: Record<string, unknown>;
  credentialSchema?: { id: string; type: "JsonSchema" | string; [k: string]: unknown };
  "iu:merkleReceipt": IUSmartCertMerkleReceipt;
  proof?: never;
  [key: string]: unknown;
};

export type SignedVc = Omit<UnsignedVc, "proof"> & { proof: DataIntegrityProof };

export type AssembleVcInput = {
  credentialId: string;
  validFrom: string;
  subjectDid: string;
  degree: {
    type: string;
    name: string;
    [key: string]: unknown;
  };
  components: Array<{
    name: string;
    mandatory: boolean;
    componentType: string;
    componentHash: string;
  }>;
  merkle: {
    chainId: string;
    contractAddress: string;
    merkleRoot: string;
    anchorTx: string;
    proofs: Record<string, string[]>;
  };
};
