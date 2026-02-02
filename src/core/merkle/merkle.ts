import { keccak_256 } from "@noble/hashes/sha3.js";

import { concatBytes, utf8ToBytes } from "../utils/bytes";
import { bytes32ToHex, isHexString } from "../utils/hex";

type Leaf = { name: string; hash: string };

type HashedLeaf = {
  name: string;
  leafHash: Uint8Array; // bytes32
};

function compareBytesLex(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) continue;
    return a[i] < b[i] ? -1 : 1;
  }
  return a.length - b.length;
}

function sortPair(a: Uint8Array, b: Uint8Array): [Uint8Array, Uint8Array] {
  return compareBytesLex(a, b) <= 0 ? [a, b] : [b, a];
}

function hashLeafValue(value: string): Uint8Array {
  // Match legacy behavior: keccak256(utf8(value)).
  return keccak_256(utf8ToBytes(value));
}

export function buildMerkle(args: {
  leaves: Leaf[];
}): { merkleRoot: string; proofs: Record<string, string[]> } {
  const { leaves } = args;
  if (leaves.length === 0) {
    throw new Error("buildMerkle: leaves must not be empty");
  }

  const seenNames = new Set<string>();
  for (const leaf of leaves) {
    if (seenNames.has(leaf.name)) {
      throw new Error(`buildMerkle: duplicate leaf name: ${leaf.name}`);
    }
    seenNames.add(leaf.name);
    if (!isHexString(leaf.hash)) {
      throw new Error(`buildMerkle: leaf.hash must be 0x-hex: ${leaf.name}`);
    }
  }

  const hashedLeaves: HashedLeaf[] = leaves.map((leaf) => ({
    name: leaf.name,
    leafHash: hashLeafValue(leaf.hash),
  }));

  // Sort leaves like merkletreejs({ sort: true }) effectively does.
  hashedLeaves.sort((a, b) => compareBytesLex(a.leafHash, b.leafHash));

  const levels: Uint8Array[][] = [];
  levels.push(hashedLeaves.map((x) => x.leafHash));

  while (levels[levels.length - 1].length > 1) {
    const level = levels[levels.length - 1];
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i]; // duplicate odd
      const [a, b] = sortPair(left, right);
      next.push(keccak_256(concatBytes(a, b)));
    }
    levels.push(next);
  }

  const merkleRoot = bytes32ToHex(levels[levels.length - 1][0]);

  const proofs: Record<string, string[]> = {};
  for (let leafIndex = 0; leafIndex < hashedLeaves.length; leafIndex++) {
    const leafName = hashedLeaves[leafIndex].name;
    const proof: string[] = [];
    let idx = leafIndex;
    for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex++) {
      const level = levels[levelIndex];
      const isRight = idx % 2 === 1;
      const siblingIndex = isRight ? idx - 1 : idx + 1;
      const sibling = level[siblingIndex] ?? level[idx]; // duplicate odd
      proof.push(bytes32ToHex(sibling));
      idx = Math.floor(idx / 2);
    }
    proofs[leafName] = proof;
  }

  return { merkleRoot, proofs };
}
