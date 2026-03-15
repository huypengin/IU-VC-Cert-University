import { getEnv } from "../env";
import { normalizeRegistryUrl } from "./registryUrl";
import type {
  AssembleVcInput,
  ComponentProof,
  InlineMerkleEvidence,
  IUSmartCertMerkleReceipt,
  MerkleTreeSpec,
  UnsignedVc,
} from "./types";

/**
 * Default Merkle tree specification matching merkle.ts implementation.
 * - leafHashAlg: sha256 used for hashing component content
 * - nodeHashAlg: keccak256 used for internal tree nodes
 * - sortPairs: pairs are sorted lexicographically before hashing
 * - sortLeaves: leaves are sorted before building tree
 */
const DEFAULT_MERKLE_TREE_SPEC: MerkleTreeSpec = {
  leafHashAlg: "sha256",
  nodeHashAlg: "keccak256",
  sortPairs: true,
  sortLeaves: true,
};

export function assembleVc(input: AssembleVcInput): UnsignedVc {
  const {
    credentialId,
    validFrom,
    subjectDid,
    degree,
    components,
    merkle,
  } = input;

  const issuerDid = normalizeRegistryUrl(getEnv("ISSUER_DID"));
  const schemaUrl = normalizeRegistryUrl(getEnv("SCHEMA_URL"));
  const degreeContextUrl = normalizeRegistryUrl(getEnv("DEGREE_CONTEXT_URL"));
  const iuSmartcertContextUrl = normalizeRegistryUrl(getEnv("IU_SMARTCERT_CONTEXT_URL"));
  const merkleContextUrl = normalizeRegistryUrl(getEnv("MERKLE_CONTEXT_URL"));

  const componentsProofs: ComponentProof[] = components.map((c) => {
    const proof = merkle.proofs[c.name];
    if (!proof) {
      throw new Error(`assembleVc: missing merkle proof for component: ${c.name}`);
    }
    return {
      name: c.name,
      mandatory: c.mandatory,
      hash: c.componentHash,
      proof,
    };
  });

  // Build receipt with merkleTreeSpec for verifier use
  const merkleReceipt: IUSmartCertMerkleReceipt = {
    type: "IUSmartCertMerkleReceipt",
    chainId: merkle.chainId,
    contractAddress: merkle.contractAddress,
    merkleRoot: merkle.merkleRoot,
    anchorTx: merkle.anchorTx,
    deploymentTx: merkle.deploymentTx,
    leafEncoding: "credentialID||componentType||content",
    merkleTreeSpec: DEFAULT_MERKLE_TREE_SPEC,
    componentsProofs,
  };

  // W3C VC v2 evidence entry (preferred location)
  // Note: we override 'type' to be the tuple form required by InlineMerkleEvidence
  const evidenceEntry: InlineMerkleEvidence = {
    ...merkleReceipt,
    type: ["IUSmartCertMerkleReceipt"],
  };

  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      degreeContextUrl,
      iuSmartcertContextUrl,
      merkleContextUrl,
    ],
    type: [
      "VerifiableCredential",
      "UniversityDegree",
      "EducationalOccupationalCredential",
      "VNEduDegreeCredential",
      "IUSmartCertCredential",
    ],
    id: credentialId,
    issuer: issuerDid,
    validFrom,
    credentialSubject: {
      id: subjectDid,
      degree,
      "iu:components": components.map((c) => ({
        name: c.name,
        mandatory: c.mandatory,
        componentType: c.componentType,
        componentHash: c.componentHash,
      })),
    },
    credentialSchema: {
      id: schemaUrl,
      type: "JsonSchema",
    },
    // W3C VC v2 evidence array (preferred)
    evidence: [evidenceEntry],
    // Legacy field for backward compatibility
    "iu:merkleReceipt": merkleReceipt,
  };
}
