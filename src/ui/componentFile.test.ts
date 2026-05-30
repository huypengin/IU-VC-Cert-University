import test from "node:test";
import assert from "node:assert/strict";

import { formatComponentFileContent } from "./componentFile.js";

test("formatComponentFileContent serializes uploaded PDF metadata and data URL", () => {
  const content = formatComponentFileContent({
    name: "diploma.pdf",
    type: "application/pdf",
    size: 1234,
    dataUrl: "data:application/pdf;base64,abc123",
  });

  const parsed = JSON.parse(content);
  assert.equal(parsed.source, "uploaded-file");
  assert.equal(parsed.filename, "diploma.pdf");
  assert.equal(parsed.mediaType, "application/pdf");
  assert.equal(parsed.size, 1234);
  assert.equal(parsed.dataUrl, "data:application/pdf;base64,abc123");
});

test("formatComponentFileContent rejects non-data-url content", () => {
  assert.throws(
    () =>
      formatComponentFileContent({
        name: "diploma.pdf",
        type: "application/pdf",
        size: 1234,
        dataUrl: "abc123",
      }),
    /data URL/i,
  );
});
