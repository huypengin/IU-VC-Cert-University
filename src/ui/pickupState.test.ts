import test from "node:test";
import assert from "node:assert/strict";
import { describeExpiryState } from "./pickupState.js";

test("describeExpiryState returns expired when timer is 0", () => {
  assert.equal(describeExpiryState(0), "expired");
});
