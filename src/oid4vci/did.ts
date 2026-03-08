type DidPublicJwk = {
  alg?: string;
  crv?: string;
  kid?: string;
  kty: string;
  use?: string;
  x?: string;
  y?: string;
};

type DidVerificationMethod = {
  id: string;
  type: "JsonWebKey2020";
  controller: string;
  publicKeyJwk: DidPublicJwk;
};

type DidDocument = {
  "@context": string[];
  id: string;
  verificationMethod: DidVerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
};

function verificationMethodId(did: string, keyId: string): string {
  return keyId.startsWith(`${did}#`) ? keyId : `${did}#${keyId}`;
}

export function didWebPathFromDid(did: string): string {
  if (!did.startsWith("did:web:")) {
    throw new Error(`Unsupported DID method: ${did}`);
  }

  const methodSpecificId = did.slice("did:web:".length);
  const segments = methodSpecificId.split(":");

  if (segments.length === 1) {
    return "/.well-known/did.json";
  }

  return `/${segments.slice(1).join("/")}/did.json`;
}

export function buildDidDocument(
  did: string,
  publicKeyJwk: DidPublicJwk,
  keyId: string,
): DidDocument {
  const vmId = verificationMethodId(did, keyId);

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: did,
    verificationMethod: [
      {
        id: vmId,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk,
      },
    ],
    authentication: [vmId],
    assertionMethod: [vmId],
  };
}
