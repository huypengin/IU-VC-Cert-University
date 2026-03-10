export type ComponentInput = {
  name: string;
  mandatory: boolean;
  componentType: string;
  content: string; // demo content or digest string
};

export type HashedComponent = {
  name: string;
  mandatory: boolean;
  componentType: string;
  componentHash: string; // 0x-prefixed hex string
};

export const LEAF_ENCODING = "credentialID||componentType||content" as const;
export const HASH_ALG = "sha256" as const;

export { hashComponents } from "./hashing/hashComponents";
export { buildMerkle } from "./merkle/merkle";
export { anchorRoot } from "./chain/registry";
export { revokeCredentialOnChain } from "./chain/revocation";
