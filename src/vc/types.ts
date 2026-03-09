export type DataIntegrityProof = {
  type: "DataIntegrityProof" | string;
  cryptosuite: "eddsa-rdfc-2022" | string;
  proofPurpose: "assertionMethod" | string;
  created: string;
  verificationMethod: string;
  proofValue: string;
  [key: string]: unknown;
};

/**
 * Describes how the Merkle tree was constructed.
 * Used by verifiers to reconstruct and validate proofs.
 */
export type MerkleTreeSpec = {
  /** Hash algorithm for leaf values (before tree construction) */
  leafHashAlg: "sha256";
  /** Hash algorithm for internal nodes */
  nodeHashAlg: "keccak256";
  /** Whether pairs are sorted before hashing */
  sortPairs: true;
  /** Whether leaves are sorted before building tree */
  sortLeaves: true;
};

export type ComponentProof = {
  name: string;
  mandatory: boolean;
  hash: string;
  proof: string[];
};

/**
 * Merkle receipt for IU-SmartCert credentials.
 * Can be attached inline in evidence or referenced externally.
 */
export type IUSmartCertMerkleReceipt = {
  type: "IUSmartCertMerkleReceipt" | string;
  chainId: string;
  contractAddress: string;
  merkleRoot: string;
  anchorTx: string;
  /** @deprecated Use merkleTreeSpec.leafHashAlg instead */
  hashAlg?: "sha256";
  leafEncoding: "credentialID||componentType||content";
  /** Tree construction parameters for verification */
  merkleTreeSpec: MerkleTreeSpec;
  componentsProofs: ComponentProof[];
  [key: string]: unknown;
};

/**
 * External receipt reference (when receipt is hosted by issuer API)
 */
export type ExternalReceiptReference = {
  type: ["IUSmartCertMerkleReceipt"];
  /** URL to fetch the receipt */
  id: string;
  /** Multibase-encoded digest for integrity check */
  digestMultibase: string;
  /** Media type of the external receipt */
  mediaType: "application/json";
};

/**
 * Inline evidence entry containing full Merkle receipt.
 * Uses tuple form of type for W3C VC v2 compliance.
 */
export type InlineMerkleEvidence = {
  type: ["IUSmartCertMerkleReceipt"];
} & Omit<IUSmartCertMerkleReceipt, "type">;

/**
 * W3C VC v2 Evidence entry - either inline receipt or external reference
 */
export type IUSmartCertEvidence = InlineMerkleEvidence | ExternalReceiptReference;

export type UnsignedVc = {
  "@context": string | string[];
  type: string | string[];
  id?: string;
  issuer: string;
  validFrom: string;
  validUntil?: string;
  credentialSubject: Record<string, unknown>;
  credentialSchema?: { id: string; type: "JsonSchema" | string;[k: string]: unknown };
  credentialStatus?: {
    id?: string;
    type: "StatusList2021Entry" | string;
    statusPurpose: string;
    statusListCredential: string;
    statusListIndex: string | number;
    [key: string]: unknown;
  };
  /** W3C VC v2 evidence array - preferred location for Merkle receipt */
  evidence?: IUSmartCertEvidence[];
  /** @deprecated Legacy location for Merkle receipt, use evidence instead */
  "iu:merkleReceipt"?: IUSmartCertMerkleReceipt;
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
  statusList?: {
    statusPurpose: string;
    statusListCredential: string;
    statusListIndex: string | number;
  };
};
