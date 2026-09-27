import type { IUSmartCertMerkleReceipt } from "../vc/types";
import { resolveReceipt } from "../verifier/receiptResolver";

export function getRevocationKeyFromReceipt(receipt: IUSmartCertMerkleReceipt): string {
  const mandatoryComponent = receipt.componentsProofs?.find((component) => component.mandatory);

  if (mandatoryComponent?.hash) {
    return mandatoryComponent.hash;
  }

  // Fallback: For single-paper credentials (e.g. transcript, recruiter submission)
  // or credentials where no component is explicitly marked mandatory,
  // use the first available component hash.
  const fallbackComponent = receipt.componentsProofs?.find((component) => component.hash);
  if (fallbackComponent?.hash) {
    return fallbackComponent.hash;
  }

  throw new Error("No component hash found for revocation");
}

export async function getRevocationKeyFromVc(vc: Record<string, unknown>): Promise<string> {
  const { receipt } = await resolveReceipt(vc);
  return getRevocationKeyFromReceipt(receipt);
}
