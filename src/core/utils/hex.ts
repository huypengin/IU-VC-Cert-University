export function strip0x(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

export function isHexString(value: string): boolean {
  if (typeof value !== "string") return false;
  if (!value.startsWith("0x")) return false;
  const body = value.slice(2);
  return body.length > 0 && /^[0-9a-fA-F]+$/.test(body);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function bytes32ToHex(bytes: Uint8Array): string {
  if (bytes.length !== 32) {
    throw new Error(`Expected 32 bytes, got ${bytes.length}`);
  }
  return `0x${bytesToHex(bytes)}`;
}

export function hexToBytes32(hex: string): Uint8Array {
  const clean = strip0x(hex);
  if (clean.length !== 64) {
    throw new Error(`Expected 32-byte hex string, got length ${clean.length}`);
  }
  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error("Invalid hex");
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

