export interface ParsedPickupVcFile {
  filename: string;
  vc: Record<string, unknown>;
  subjectId?: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePickupVcJson(text: string, filename: string): ParsedPickupVcFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Uploaded file is not valid JSON");
  }

  if (!isObjectRecord(parsed)) {
    throw new Error("Uploaded file must contain a VC object");
  }

  const credentialSubject = parsed.credentialSubject;
  const subjectId =
    isObjectRecord(credentialSubject) && typeof credentialSubject.id === "string"
      ? credentialSubject.id
      : undefined;

  return {
    filename,
    vc: parsed,
    subjectId,
  };
}
