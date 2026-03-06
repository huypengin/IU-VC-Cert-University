import type { IUSmartCertDocument } from './schema';

// Example runtime value using the generated interface to avoid 'unused' export warnings
export const SAMPLE_IUSMARTCERT_DOCUMENT: IUSmartCertDocument = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://iu-smartcert.ngrok-free.dev/contexts/iu-edu-degree-v1.jsonld"
  ],
  type: ["VerifiableCredential", "VNEduDegreeCredential"],
  id: "urn:uuid:example-degree-2025",
  issuer: "did:web:iu-smartcert.ngrok-free.dev:issuers:iu",
  validFrom: "2025-06-01T00:00:00Z",
  credentialSubject: {
    id: "did:example:student123",
    degree: {
      type: "BachelorDegree",
      name: "Bachelor of Science in Computer Science"
    }
  },
  credentialSchema: {
    id: "https://iu-smartcert.ngrok-free.dev/contexts/iu-edu-degree-v1.schema.jsonld",
    type: "JsonSchema"
  },
  credentialStatus: {
      id: "https://iu-smartcert.ngrok-free.dev/status/degree/2025#list",
    type: "StatusList2021Entry",
    statusPurpose: "revocation",
    statusListCredential: "https://iu-smartcert.ngrok-free.dev/status/degree/2025",
    statusListIndex: "0"
  },
  proof: {
    type: "DataIntegrityProof",
    cryptosuite: "merkle-receipt-2025",
    proofPurpose: "assertionMethod",
    created: "2025-06-20T09:12:03Z",
    verificationMethod: "did:web:iu-smartcert.ngrok-free.dev:issuers:iu#key-1",
      proofValue: 'something here', //real signature value proof 1 (compusory field)
    merkleReceipt: { // merkle receipt specific fields proof 2 (optional field)
      chainId: "eip155:11155111",
      contractAddress: "0xREGISTRY...",
      merkleRoot: "0xROOT...",
      anchorTx: "0xTX...",
      hashAlg: "sha256",
      leafEncoding: "credentialID||componentType||content"
    }
  }
};
