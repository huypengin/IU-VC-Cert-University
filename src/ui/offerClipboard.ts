export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

export async function copyOfferUrl(
  clipboard: ClipboardWriter | undefined,
  offerUri: string,
): Promise<void> {
  if (!clipboard) {
    throw new Error("Clipboard support is unavailable in this browser");
  }

  await clipboard.writeText(offerUri);
}
