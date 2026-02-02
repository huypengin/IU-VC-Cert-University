import type { IUSmartCertUniversityCredential } from "../1.1/types";

export const SAMPLE_IUSMARTCERT_VC_2: IUSmartCertUniversityCredential = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://helena-unda-bounceably.ngrok-free.dev/contexts/iu-edu-degree-v1.jsonld",
    "https://helena-unda-bounceably.ngrok-free.dev/contexts/iu-smartcert-v1.jsonld",
    "https://helena-unda-bounceably.ngrok-free.dev/contexts/merkle-receipt-v1.jsonld"
  ],
  type: ["VerifiableCredential", "VNEduDegreeCredential", "IUSmartCertCredential"],
  id: "urn:uuid:example-degree-2025",

  issuer: "did:web:helena-unda-bounceably.ngrok-free.dev:issuers:iu",
  validFrom: "2025-06-01T00:00:00Z",

  credentialSubject: {
    id: "did:example:student123",
    degree: {
      type: "BachelorDegree",
      name: "Bachelor of Science in Computer Science"
    },
    "iu:components": [
      {
        name: "diploma",
        mandatory: true,
        componentType: "degreeCertificate",
        componentHash: "0xLEAF_HASH_DIPLOMA"
      },
      {
        name: "transcript",
        mandatory: false,
        componentType: "academicTranscript",
        componentHash: "0xLEAF_HASH_TRANSCRIPT"
      }
    ]
  },

  credentialSchema: {
    id: "https://helena-unda-bounceably.ngrok-free.dev/contexts/iu-edu-degree-v1.schema.jsonld",
    type: "JsonSchema"
  },

  credentialStatus: {
    id: "https://helena-unda-bounceably.ngrok-free.dev/status/degree/2025#list",
    type: "StatusList2021Entry",
    statusPurpose: "revocation",
    statusListCredential: "https://helena-unda-bounceably.ngrok-free.dev/status/degree/2025",
    statusListIndex: "0"
  },

  // IU-SmartCert extension (non-critical, outside proof)
  "iu:merkleReceipt": {
    type: "IUSmartCertMerkleReceipt",
    chainId: "eip155:11155111",
    contractAddress: "0xREGISTRY...",
    merkleRoot: "0xROOT...",
    anchorTx: "0xTX...",
    hashAlg: "sha256",
    leafEncoding: "credentialID||componentType||content"
  },

  // Optional: if you want a “safe” place to attach extra artifacts:
  evidence: [
    {
      id: "https://helena-unda-bounceably.ngrok-free.dev/receipts/example-degree-2025.json",
      type: ["VerifiableDocument"],
      digestMultibase: "uSHA256_MULTIBASE_OF_RECEIPT_JSON",
      "iu:purpose": "merkleReceipt"
    }
  ],

  proof: {
    type: "DataIntegrityProof",
    cryptosuite: "eddsa-rdfc-2022",
    proofPurpose: "assertionMethod",
    created: "2025-06-20T09:12:03Z",
    verificationMethod:
      "did:web:helena-unda-bounceably.ngrok-free.dev:issuers:iu#key-1",
    proofValue: "zREAL_SIGNATURE_VALUE_HERE"
  }
}
