import { getEnv } from "../env";
import type { AssembleVcInput, IUSmartCertMerkleReceipt, UnsignedVc } from "./types";

export function assembleVc(input: AssembleVcInput): UnsignedVc {
  const {
    credentialId,
    validFrom,
    subjectDid,
    degree,
    components,
    merkle,
  } = input;

  const issuerDid = getEnv("ISSUER_DID");
  const schemaUrl = getEnv("SCHEMA_URL");
  const degreeContextUrl = getEnv("DEGREE_CONTEXT_URL");
  const iuSmartcertContextUrl = getEnv("IU_SMARTCERT_CONTEXT_URL");
  const merkleContextUrl = getEnv("MERKLE_CONTEXT_URL");

  const componentsProofs = components.map((c) => {
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

  const merkleReceipt: IUSmartCertMerkleReceipt = {
    type: "IUSmartCertMerkleReceipt",
    chainId: merkle.chainId,
    contractAddress: merkle.contractAddress,
    merkleRoot: merkle.merkleRoot,
    anchorTx: merkle.anchorTx,
    hashAlg: "sha256",
    leafEncoding: "credentialID||componentType||content",
    componentsProofs,
  };

  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      degreeContextUrl,
      iuSmartcertContextUrl,
      merkleContextUrl,
    ],
    type: ["VerifiableCredential", "VNEduDegreeCredential", "IUSmartCertCredential"],
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
    "iu:merkleReceipt": merkleReceipt,
  };
}
