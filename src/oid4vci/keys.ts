/**
 * ES256 (P-256) key management for OID4VCI JWT signing.
 *
 * - Loads private key from OID4VCI_PRIVATE_JWK env var (JWK JSON string), OR
 * - Auto-generates a new key pair on first run and logs the JWK to console.
 */

import * as jose from "jose";

let privateKey: jose.KeyLike | Uint8Array;
let publicJWK: jose.JWK;
let kid: string;

/**
 * Initialise the signing key pair.
 * Call once at server startup.
 */
export async function initKeys(): Promise<void> {
  const jwkEnv = process.env.OID4VCI_PRIVATE_JWK;

  if (jwkEnv) {
    // Load from env
    const parsed = JSON.parse(jwkEnv) as jose.JWK;
    privateKey = await jose.importJWK(parsed, "ES256");
    kid = parsed.kid ?? "oid4vci-key-1";

    // Derive public JWK
    const { d: _d, ...pub } = parsed; // strip private component
    publicJWK = { ...pub, kid, use: "sig", alg: "ES256" };
  } else {
    // Auto-generate
    const { publicKey: pub, privateKey: priv } = await jose.generateKeyPair(
      "ES256",
      { extractable: true },
    );
    privateKey = priv;
    kid = "oid4vci-demo-key-1";

    const exported = await jose.exportJWK(priv);
    exported.kid = kid;
    exported.alg = "ES256";
    exported.use = "sig";

    console.log(
      "\n⚠️  No OID4VCI_PRIVATE_JWK found – generated a demo key pair.",
    );
    console.log("   To persist this key, set the env var:");
    console.log(`   OID4VCI_PRIVATE_JWK='${JSON.stringify(exported)}'\n`);

    const pubExported = await jose.exportJWK(pub);
    pubExported.kid = kid;
    pubExported.alg = "ES256";
    pubExported.use = "sig";
    publicJWK = pubExported;
  }
}

/** Get the private key for JWT signing. */
export function getPrivateKey(): jose.KeyLike | Uint8Array {
  if (!privateKey) throw new Error("Keys not initialised – call initKeys()");
  return privateKey;
}

/** Get the key ID. */
export function getKid(): string {
  return kid;
}

/** Return the public JWKS object (for /.well-known/jwks.json). */
export function getPublicJWKS(): { keys: jose.JWK[] } {
  if (!publicJWK) throw new Error("Keys not initialised – call initKeys()");
  return { keys: [publicJWK] };
}
