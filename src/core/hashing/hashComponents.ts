import { sha256 } from "@noble/hashes/sha2.js";

import type { ComponentInput, HashedComponent } from "../index";
import { utf8ToBytes } from "../utils/bytes";
import { bytesToHex } from "../utils/hex";

export function hashComponents(args: {
  credentialId: string;
  components: ComponentInput[];
  hashAlg: "sha256";
  leafEncoding: "credentialID||componentType||content";
}): HashedComponent[] {
  const { credentialId, components, hashAlg, leafEncoding } = args;
  if (hashAlg !== "sha256") {
    throw new Error(`Unsupported hashAlg: ${hashAlg}`);
  }
  if (leafEncoding !== "credentialID||componentType||content") {
    throw new Error(`Unsupported leafEncoding: ${leafEncoding}`);
  }
  if (!credentialId) {
    throw new Error("credentialId is required");
  }

  return components.map((component) => {
    const leaf = `${credentialId}||${component.componentType}||${component.content}`;
    const digest = sha256(utf8ToBytes(leaf));
    return {
      name: component.name,
      mandatory: component.mandatory,
      componentType: component.componentType,
      componentHash: `0x${bytesToHex(digest)}`,
    };
  });
}
