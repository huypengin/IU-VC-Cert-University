export type IUSmartCertUniversityCredential = {
  '@context': string | string[];
  type: string | string[];
  id?: string;
  issuer: string | Issuer;
  validFrom: string;
  credentialSubject: CredentialSubject;
  'iu:merkleReceipt'?: IUSmartCertMerkleReceipt;
  'iuSmartCert:merkleReceipt'?: IUSmartCertMerkleReceipt;
  evidence?: Evidence[];
  credentialSchema?: CredentialSchema;
  credentialStatus?: CredentialStatus;
  proof?: DataIntegrityProof;
  [key: string]: unknown;
};

// Back-compat with `src/1.0/type.ts` naming.
export type VCModel = IUSmartCertUniversityCredential;

export type Issuer = {
  id: string;
  name?: string;
  [key: string]: unknown;
};

export type CredentialSubject = {
  id: string;
  studentId?: string;
  fullName?: string;
  dateOfBirth?: string;
  degree?: Degree;
  'iu:components'?: IUSmartCertComponent[];
  'iuSmartCert:components'?: IUSmartCertComponent[];
  [key: string]: unknown;
};

export type Degree = {
  type?: string;
  name?: string;
  program?: string;
  graduationDate?: string;
  [key: string]: unknown;
};

export type IUSmartCertComponent = {
  name: string;
  mandatory: boolean;
  componentType: string;
  componentHash: string;
  [key: string]: unknown;
};

export type Evidence = {
  id: string;
  type: string | string[];
  digestMultibase?: string;
  'iu:purpose'?: string;
  'iuSmartCert:componentName'?: string;
  'iuSmartCert:componentHash'?: string;
  [key: string]: unknown;
};

export type CredentialSchema = {
  id: string;
  type: string;
  [key: string]: unknown;
};

export type CredentialStatus = StatusListEntry | IUSmartCertOnChainStatusEntry;

export type StatusListEntry = {
  type: string;
  statusPurpose: string;
  statusListCredential: string;
  statusListIndex: string | number;
  id?: string;
  [key: string]: unknown;
};

export type IUSmartCertOnChainStatusEntry = {
  type: 'IUSmartCertOnChainStatusEntry' | string;
  statusPurpose: string;
  statusChainId: string;
  statusContractAddress: string;
  statusMethod: string;
  statusEntry: string;
  [key: string]: unknown;
};

export type DataIntegrityProof = {
  type: 'DataIntegrityProof' | string;
  cryptosuite: string;
  proofPurpose: string;
  created: string;
  verificationMethod: string;
  proofValue?: string;
  [key: string]: unknown;
};

export type MerkleReceipt = {
  chainId: string;
  contractAddress: string;
  merkleRoot: string;
  anchorTx: string;
  hashAlg: string;
  leafEncoding: string;
  [key: string]: unknown;
};

export type IUSmartCertMerkleReceipt = MerkleReceipt & {
  type?: 'IUSmartCertMerkleReceipt' | string;
  componentsProofs?: ComponentProof[];
  [key: string]: unknown;
};

export type ComponentProof = {
  name: string;
  mandatory: boolean;
  hash: string;
  proof: string[];
  [key: string]: unknown;
};
