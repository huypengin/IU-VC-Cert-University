import { resolveReceipt } from "../verifier/receiptResolver";
import { getRevocationKeyFromReceipt } from "./key";

export async function buildRevocationRequestFromVc(vc: Record<string, unknown>): Promise<{
  chainId: string;
  contractAddress: string;
  revocationKey: string;
}> {
  const { receipt } = await resolveReceipt(vc);

  return {
    chainId: receipt.chainId,
    contractAddress: receipt.contractAddress,
    revocationKey: getRevocationKeyFromReceipt(receipt),
  };
}
