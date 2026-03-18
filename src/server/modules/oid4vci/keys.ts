/**
 * OID4VCI JWT signing key management.
 *
 * - Loads private key from OID4VCI_PRIVATE_JWK env var (JWK JSON string). For
 *   registry-backed issuance this should be the ES256 private JWK whose `kid`
 *   matches the issuer DID document verification method (for example
 *   `did:web:...#key-1`), OR
 * - Uses ISSUER_ED25519_PRIVATE_KEY (Ed25519) for EdDSA signing when available, OR
 * - Auto-generates a new key pair on first run and logs the JWK to console.
 */

import * as jose from "jose";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base58btc } from "multiformats/bases/base58";

type SigningKey = Parameters<jose.SignJWT["sign"]>[0];
type SigningAlg = "ES256" | "EdDSA";

let privateKey: SigningKey;
let publicJWK: jose.JWK;
let kid: string;
let signingAlg: SigningAlg = "ES256";

function strip0x(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function base64ToBytes(input: string): Uint8Array {
  return Uint8Array.from(Buffer.from(input, "base64"));
}

function hexToBytes(input: string): Uint8Array {
  const hex = strip0x(input);
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Invalid hex private key");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function decodeEd25519PrivateKey(input: string): Uint8Array {
  const trimmed = input.trim();
  const hex = strip0x(trimmed);
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return hexToBytes(hex);
  return base64ToBytes(trimmed);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function toEd25519Multibase(publicKey: Uint8Array): string {
  const prefixed = new Uint8Array(2 + publicKey.length);
  prefixed[0] = 0xed;
  prefixed[1] = 0x01;
  prefixed.set(publicKey, 2);
  return base58btc.encode(prefixed);
}

function inferAlgFromJwk(jwk: jose.JWK): SigningAlg {
  if (jwk.alg === "ES256" || jwk.alg === "EdDSA") return jwk.alg;
  if (jwk.kty === "EC" && jwk.crv === "P-256") return "ES256";
  if (jwk.kty === "OKP" && jwk.crv === "Ed25519") return "EdDSA";
  throw new Error("Unsupported OID4VCI_PRIVATE_JWK key type/curve for JWT signing");
}

function requiresRegistryJwk(issuerDid?: string): boolean {
  return Boolean(issuerDid?.startsWith("did:web:") && issuerDid.includes(":issuers:"));
}

/**
 * Initialise the signing key pair.
 * Call once at server startup.
 */
export async function initKeys(): Promise<void> {
  const jwkEnv = process.env.OID4VCI_PRIVATE_JWK?.trim();
  const issuerDid = process.env.ISSUER_DID?.trim();

  if (jwkEnv) {
    // Load from env
    const parsed = JSON.parse(jwkEnv) as jose.JWK;
    signingAlg = inferAlgFromJwk(parsed);
    privateKey = await jose.importJWK(parsed, signingAlg);
    kid = parsed.kid ?? "oid4vci-key-1";

    // Derive public JWK
    const { d: _d, ...pub } = parsed; // strip private component
    publicJWK = { ...pub, kid, use: "sig", alg: signingAlg };
    return;
  }

  if (requiresRegistryJwk(issuerDid)) {
    throw new Error(
      "OID4VCI_PRIVATE_JWK must be set to the ES256 private JWK matching the issuer did.json verification method for registry did:web issuers.",
    );
  }

  const ed25519PrivateKey = process.env.ISSUER_ED25519_PRIVATE_KEY?.trim();
  if (ed25519PrivateKey) {
    const privateKeyBytes = decodeEd25519PrivateKey(ed25519PrivateKey);
    if (privateKeyBytes.length !== 32) {
      throw new Error(
        `ISSUER_ED25519_PRIVATE_KEY must be 32 bytes, got ${privateKeyBytes.length}`,
      );
    }

    const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
    const keyMultibase = toEd25519Multibase(publicKeyBytes);

    kid =
      process.env.OID4VCI_KID?.trim()
      || (issuerDid ? `${issuerDid}:${keyMultibase}` : keyMultibase);
    signingAlg = "EdDSA";

    const privateJwk: jose.JWK = {
      kty: "OKP",
      crv: "Ed25519",
      d: bytesToBase64Url(privateKeyBytes),
      x: bytesToBase64Url(publicKeyBytes),
      kid,
      use: "sig",
      alg: signingAlg,
    };

    privateKey = await jose.importJWK(privateJwk, signingAlg);
    const { d: _d, ...pub } = privateJwk;
    publicJWK = pub;
    return;
  } else {
    // Auto-generate
    const { publicKey: pub, privateKey: priv } = await jose.generateKeyPair(
      "ES256",
      { extractable: true },
    );
    privateKey = priv;
    kid = "oid4vci-demo-key-1";
    signingAlg = "ES256";

    const exported = await jose.exportJWK(priv);
    exported.kid = kid;
    exported.alg = signingAlg;
    exported.use = "sig";

    console.log(
      "\n⚠️  No OID4VCI_PRIVATE_JWK found – generated a demo key pair.",
    );
    console.log("   To persist this key, set the env var:");
    console.log(`   OID4VCI_PRIVATE_JWK='${JSON.stringify(exported)}'\n`);

    const pubExported = await jose.exportJWK(pub);
    pubExported.kid = kid;
    pubExported.alg = signingAlg;
    pubExported.use = "sig";
    publicJWK = pubExported;
  }
}

/** Get the private key for JWT signing. */
export function getPrivateKey(): SigningKey {
  if (!privateKey) throw new Error("Keys not initialised – call initKeys()");
  return privateKey;
}

/** Get the key ID. */
export function getKid(): string {
  return kid;
}

/** Get the active JWT signing algorithm. */
export function getSigningAlg(): SigningAlg {
  return signingAlg;
}

/** Return the public JWKS object (for /.well-known/jwks.json). */
export function getPublicJWKS(): { keys: jose.JWK[] } {
  if (!publicJWK) throw new Error("Keys not initialised – call initKeys()");
  return { keys: [publicJWK] };
}
