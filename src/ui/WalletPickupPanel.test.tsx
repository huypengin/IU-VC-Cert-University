import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WalletPickupPanel } from "./WalletPickupPanel.js";

test("WalletPickupPanel is upload-only and disables Add to Wallet before a VC is loaded", () => {
  const html = renderToStaticMarkup(
    <WalletPickupPanel
      pickupBusy={false}
      pickupError={null}
      pickupOffer={null}
      pickupQrSrc=""
      pickupSecondsLeft={0}
      pickupExpiryState="safe"
      canCreateOffer={false}
      selectedFilename={null}
      detectedSubjectId={null}
      onFileChange={() => undefined}
      onCreatePickupOffer={() => undefined}
    />,
  );

  assert.match(html, /type="file"/);
  assert.match(html, /Add to Wallet/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /Subject DID \(optional override\)/);
});

test("WalletPickupPanel shows the selected file, detected subject, and QR actions", () => {
  const html = renderToStaticMarkup(
    <WalletPickupPanel
      pickupBusy={false}
      pickupError={null}
      pickupOffer={{
        offerUri: "openid-credential-offer://?credential_offer=x",
        expiresInSec: 300,
      }}
      pickupQrSrc="https://example.com/qr.png"
      pickupSecondsLeft={300}
      pickupExpiryState="safe"
      canCreateOffer={true}
      selectedFilename="student.vc.json"
      detectedSubjectId="did:example:student123"
      onFileChange={() => undefined}
      onCreatePickupOffer={() => undefined}
    />,
  );

  assert.match(html, /student\.vc\.json/);
  assert.match(html, /did:example:student123/);
  assert.match(html, /Open Wallet Deep Link/);
  assert.match(html, /Generate new QR/);
});
