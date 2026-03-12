import test from "node:test";
import assert from "node:assert/strict";

import { copyOfferUrl } from "./offerClipboard.js";

test("copyOfferUrl writes the offer URI to the clipboard", async () => {
  let copied = "";

  await copyOfferUrl(
    {
      writeText: async (value: string) => {
        copied = value;
      },
    },
    "openid-credential-offer://x",
  );

  assert.equal(copied, "openid-credential-offer://x");
});

test("copyOfferUrl throws a clear error when clipboard is unavailable", async () => {
  await assert.rejects(
    () => copyOfferUrl(undefined, "openid-credential-offer://x"),
    /clipboard/i,
  );
});
