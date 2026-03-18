export interface CredentialOfferPayload {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants: Record<string, unknown>;
}

export function buildCredentialOfferUri(payload: CredentialOfferPayload): string {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  return `openid-credential-offer://?credential_offer=${encoded}`;
}

export function buildCredentialOfferUriByReference(offerUrl: string): string {
  const encoded = encodeURIComponent(offerUrl);
  return `openid-credential-offer://?credential_offer_uri=${encoded}`;
}
