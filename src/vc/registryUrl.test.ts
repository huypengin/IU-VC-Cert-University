import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRegistryUrl } from "./registryUrl.js";

test("normalizeRegistryUrl rewrites legacy ngrok host to Cloud Run host", () => {
  const input = "https://iu-smartcert.ngrok-free.dev/contexts/iu-edu-degree-v1.jsonld";
  const output = normalizeRegistryUrl(input);

  assert.equal(
    output,
    "https://infra-vc-registry-web-911368042037.asia-east2.run.app/contexts/iu-edu-degree-v1.jsonld",
  );
});

test("normalizeRegistryUrl keeps non-legacy host unchanged", () => {
  const input = "https://example.edu/schemas/IUSmartCertUniversityCredential.json";
  const output = normalizeRegistryUrl(input);

  assert.equal(output, input);
});

