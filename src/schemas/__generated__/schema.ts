export interface IUSmartCertDocument {
  "@context": string | string[];
  type: string | string[];
  id?: string;
  issuer?: string;
  validFrom?: string;
  credentialSubject?: CredentialSubject;
  credentialSchema?: CredentialSchema;
  credentialStatus?: CredentialStatus;
  proof?: Proof;
  [key: string]: any;
}

export interface CredentialSubject {
  id?: string;
  degree?: Degree;
  [key: string]: any;
}

export interface Degree {
  type?: string;
  name?: string;
  [key: string]: any;
}

export interface CredentialSchema {
  id?: string;
  type?: string;
  [key: string]: any;
}

export interface CredentialStatus {
  type?: string;
  statusPurpose?: string;
  statusListCredential?: string;
  statusListIndex?: string | number;
  [key: string]: any;
}

export interface Proof {
  type?: string;
  cryptosuite?: string;
  proofPurpose?: string;
  created?: string; // ISO date-time
  verificationMethod?: string;
  merkleReceipt?: MerkleReceipt;
  [key: string]: any;
}

export interface MerkleReceipt {
  chainId?: string;
  contractAddress?: string;
  merkleRoot?: string;
  anchorTx?: string;
  hashAlg?: string;
  leafEncoding?: string;
  [key: string]: any;
}