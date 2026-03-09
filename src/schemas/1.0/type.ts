export type VCModel = {
    '@context': string | string[];
    type: string | string[];
    credentialSubject: Record<string, any>;
    issuer: string | Record<string, any>;
    issuanceDate?: string;
    validFrom?: string;
    expirationDate?: string;
    proof?: Record<string, any>;
}

export type CredentialStatus = {
    id?: string;
    type: string;
    statusPurpose: string;
    statusListCredential: string;
    statusListIndex: string;
}

export type ProofModel = {
    type: string;
    cryptosuite: string;
    proofPurpose: string;
    verificationMethod: string;
    merkleReceipt: MerkleReceipt;
}

export type MerkleReceipt = {
    chainId: string;
    contractAddress: string;
    merkleRoot: string;
    anchorTx: string;
    hashAlg: string;
    leftEncoding: typeof LeftEncoding;
}

export const LeftEncoding = {
    credentialID: 'CredentialID',
    componentType: 'componentType',
    content: 'content',
}
