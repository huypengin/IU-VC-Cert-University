import { ed25519 } from "@noble/curves/ed25519.js";
import { base58btc } from "multiformats/bases/base58";

import { getEnv } from "../env";
import type { DataIntegrityProof, SignedVc, UnsignedVc } from "./types";

type SignOptions = { created?: string };

function strip0x(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function utf8ToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const BufferCtor = (globalThis as any).Buffer;
  if (BufferCtor?.from) {
    return Uint8Array.from(BufferCtor.from(b64, "base64"));
  }
  throw new Error("base64 decoding is not supported in this environment");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = strip0x(hex);
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error("Invalid hex private key");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function decodeEd25519PrivateKey(input: string): Uint8Array {
  const trimmed = input.trim();
  const hex = strip0x(trimmed);
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return hexToBytes(hex);
  return base64ToBytes(trimmed);
}

function stableStringify(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return JSON.stringify(value);
  if (t !== "object") return "null";

  if (Array.isArray(value)) {
    const items = value.map((v) => {
      const s = stableStringify(v);
      return s === undefined ? "null" : s;
    });
    return `[${items.join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort((a, b) => a.localeCompare(b));
  const props = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${props.join(",")}}`;
}

function canonicalizeForDemo(
  vcWithoutProof: UnsignedVc,
  proofOptions: Pick<
    DataIntegrityProof,
    "type" | "cryptosuite" | "proofPurpose" | "created" | "verificationMethod"
  >,
): Uint8Array {
  // TODO(Phase 3+): Replace this demo canonicalization with proper RDF Dataset Canonicalization 2022 (RDFC)
  // and JSON-LD processing per `eddsa-rdfc-2022`.
  //
  // For Phase 2 we sign a deterministic, stable JSON representation of:
  //   { document: <vcWithoutProof>, proof: <proofOptions> }
  const toSign = {
    document: vcWithoutProof,
    proof: proofOptions,
  };
  return utf8ToBytes(stableStringify(toSign));
}

export async function signVc(
  vcWithoutProof: UnsignedVc,
  options: SignOptions = {},
): Promise<SignedVc> {
  if ((vcWithoutProof as any).proof) {
    throw new Error("signVc: vcWithoutProof must not already contain a proof");
  }

  const issuerDid = getEnv("ISSUER_DID");
  const ed25519PrivateKey = getEnv("ISSUER_ED25519_PRIVATE_KEY");

  const created = options.created ?? new Date().toISOString();
  const proofOptions: Pick<
    DataIntegrityProof,
    "type" | "cryptosuite" | "proofPurpose" | "created" | "verificationMethod"
  > = {
    type: "DataIntegrityProof",
    cryptosuite: "eddsa-rdfc-2022",
    proofPurpose: "assertionMethod",
    created,
    verificationMethod: `${issuerDid}#key-1`,
  };

  const message = canonicalizeForDemo(vcWithoutProof, proofOptions);
  const privateKey = decodeEd25519PrivateKey(ed25519PrivateKey);
  if (privateKey.length !== 32) {
    throw new Error(`signVc: expected 32-byte Ed25519 private key, got ${privateKey.length} bytes`);
  }

  const signature = ed25519.sign(message, privateKey);
  const proofValue = base58btc.encode(signature);

  const proof: DataIntegrityProof = {
    ...proofOptions,
    proofValue,
  };

  return {
    ...(vcWithoutProof as any),
    proof,
  } as SignedVc;
}
