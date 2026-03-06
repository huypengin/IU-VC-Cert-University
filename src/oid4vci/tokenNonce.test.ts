import test from "node:test";
import assert from "node:assert/strict";
import {
  createCredentialNonce,
  createPreAuthCode,
  exchangeCodeForToken,
} from "./oid4vci.service.js";

test("exchangeCodeForToken returns c_nonce and c_nonce_expires_in", () => {
  const code = createPreAuthCode("did:example:student123");
  const token = exchangeCodeForToken(code);

  assert.equal(typeof token.access_token, "string");
  assert.equal(token.token_type, "Bearer");
  assert.equal(typeof token.expires_in, "number");
  assert.equal(typeof token.c_nonce, "string");
  assert.equal(typeof token.c_nonce_expires_in, "number");
  assert.ok(token.c_nonce_expires_in > 0);
});

test("createCredentialNonce returns nonce payload", () => {
  const nonce = createCredentialNonce();
  assert.equal(typeof nonce.c_nonce, "string");
  assert.equal(typeof nonce.c_nonce_expires_in, "number");
  assert.ok(nonce.c_nonce_expires_in > 0);
});
