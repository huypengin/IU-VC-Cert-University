import test from "node:test";
import assert from "node:assert/strict";

import { describeChainStatus } from "./chainStatus.js";

test("describeChainStatus returns a revoked summary when the chain result is revoked", () => {
  const message = describeChainStatus({
    valid: false,
    anchorTxConfirmed: true,
    revoked: true,
    revocationReason: "issuer revoked",
  });

  assert.match(message, /revoked/i);
  assert.match(message, /issuer revoked/i);
});

test("describeChainStatus returns a non-revoked summary when the VC remains valid on-chain", () => {
  const message = describeChainStatus({
    valid: true,
    anchorTxConfirmed: true,
    revoked: false,
  });

  assert.match(message, /not revoked/i);
});
