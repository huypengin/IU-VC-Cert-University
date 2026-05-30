export type ComponentFilePayload = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export function formatComponentFileContent(file: ComponentFilePayload): string {
  if (!file.name.trim()) {
    throw new Error("Component file name is required");
  }
  if (!file.dataUrl.startsWith("data:")) {
    throw new Error("Component file content must be a data URL");
  }

  return JSON.stringify({
    source: "uploaded-file",
    filename: file.name,
    mediaType: file.type || "application/octet-stream",
    size: file.size,
    dataUrl: file.dataUrl,
  });
}
