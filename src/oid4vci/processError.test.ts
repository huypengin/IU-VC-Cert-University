import test from "node:test";
import assert from "node:assert/strict";

import { formatChildProcessError } from "./processError.js";

test("formatChildProcessError explains missing ngrok CLI", () => {
  const error = new Error("spawn ngrok ENOENT") as NodeJS.ErrnoException;
  error.code = "ENOENT";

  assert.equal(
    formatChildProcessError("Ngrok", error),
    "Ngrok process error: spawn ngrok ENOENT. Install ngrok CLI or make sure it is available on PATH.",
  );
});
