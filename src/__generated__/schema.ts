export interface IUSmartCertDocument {
  "@context": string | string[];
  type: string | string[];
  id?: string;
  issuer?: string;
  validFrom?: string; // ISO date-time
  credentialSubject?: CredentialSubject;
  credentialSchema?: CredentialSchema;
  credentialStatus?: CredentialStatus;
  proof?: Proof;
  // allow additional fields that may be present in other documents
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

// Example runtime value using the generated interface to avoid 'unused' export warnings
export const SAMPLE_IUSMARTCERT_DOCUMENT: IUSmartCertDocument = {
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  type: ["VerifiableCredential", "UniversityDegreeCredential"],
  id: "urn:uuid:example-1234",
  issuer: "did:web:uni.example.edu",
  validFrom: "2025-06-01T00:00:00Z",
  credentialSubject: {
    id: "did:example:holder123",
    degree: { type: "BachelorDegree", name: "BSc in Computer Science" }
  },
  credentialSchema: {
    id: "https://uni.example.edu/schemas/UniversityDegreeCredential.json",
    type: "JsonSchema"
  },
  credentialStatus: {
    type: "StatusList202XEntry",
    statusPurpose: "revocation",
    statusListCredential: "https://example.github.io/status/2025-07.json",
    statusListIndex: "367291"
  },
  proof: {
    type: "DataIntegrityProof",
    cryptosuite: "merkle-receipt-2025",
    proofPurpose: "assertionMethod",
    created: "2025-06-20T09:12:03Z",
    verificationMethod: "did:web:uni.example.edu#keys-1",
    merkleReceipt: {
      chainId: "eip155:11155111",
      contractAddress: "0xREGISTRY...",
      merkleRoot: "0xROOT...",
      anchorTx: "0xTX...",
      hashAlg: "sha256",
      leafEncoding: "credentialID||componentType||content"
    }
  }
};
