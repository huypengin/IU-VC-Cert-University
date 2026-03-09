import type { IUSmartCertMerkleReceipt } from "../vc/types";
import { resolveReceipt } from "../verifier/receiptResolver";

export function getRevocationKeyFromReceipt(receipt: IUSmartCertMerkleReceipt): string {
  const mandatoryComponent = receipt.componentsProofs.find((component) => component.mandatory);

  if (!mandatoryComponent?.hash) {
    throw new Error("No mandatory component hash found for revocation");
  }

  return mandatoryComponent.hash;
}

export async function getRevocationKeyFromVc(vc: Record<string, unknown>): Promise<string> {
  const { receipt } = await resolveReceipt(vc);
  return getRevocationKeyFromReceipt(receipt);
}
