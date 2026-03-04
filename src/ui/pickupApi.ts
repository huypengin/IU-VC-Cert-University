export interface PickupOfferVm {
  offerUri: string;
  expiresInSec: number;
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
  const qp = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : "";
  const res = await fetch(`/oid4vci/pickup-offer${qp}`);
  if (!res.ok) throw new Error(`Failed to create offer (${res.status})`);
  return mapPickupOfferResponse(await res.json());
}
