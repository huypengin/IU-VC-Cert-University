export interface PickupOfferVm {
  offerUri: string;
  expiresInSec: number;
}

export interface CreatePickupOfferFromVcInput {
  vc: Record<string, unknown>;
  subjectId?: string;
}

const DEFAULT_OID4VCI_BASE_URL = "http://localhost:8787";

function getOid4vciBaseUrl(): string {
  if (typeof __IU_ENV__ === "undefined" || __IU_ENV__.DEV === "true") return DEFAULT_OID4VCI_BASE_URL;
  return __IU_ENV__.OID4VCI_BASE_URL || __IU_ENV__.BASE_URL || DEFAULT_OID4VCI_BASE_URL;
}

export function buildPickupOfferUrl(subjectId?: string): string {
  const url = new URL("/oid4vci/pickup-offer", getOid4vciBaseUrl());
  if (subjectId) {
    url.searchParams.set("subject_id", subjectId);
  }
  return url.toString();
}

export function mapPickupOfferResponse(raw: {
  offerUri: string;
  expiresInSec: number;
}): PickupOfferVm {
  if (!raw.offerUri?.startsWith("openid-credential-offer://")) {
    throw new Error("Invalid offer URI");
  }

  if (!Number.isFinite(raw.expiresInSec) || raw.expiresInSec <= 0) {
    throw new Error("Invalid offer expiry");
  }

  return raw;
}

export async function fetchPickupOffer(subjectId?: string): Promise<PickupOfferVm> {
  const res = await fetch(buildPickupOfferUrl(subjectId), {
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  });
  if (!res.ok) throw new Error(`Failed to create offer (${res.status})`);
  return mapPickupOfferResponse(await res.json());
}

export async function createPickupOfferFromVc(
  input: CreatePickupOfferFromVcInput,
): Promise<PickupOfferVm> {
  const res = await fetch(buildPickupOfferUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      vc: input.vc,
      ...(input.subjectId ? { subject_id: input.subjectId } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Failed to create offer (${res.status})`);
  return mapPickupOfferResponse(await res.json());
}
