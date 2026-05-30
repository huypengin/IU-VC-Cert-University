export function formatChildProcessError(
  label: string,
  error: NodeJS.ErrnoException,
): string {
  if (error.code === "ENOENT") {
    return `${label} process error: ${error.message}. Install ${label.toLowerCase()} CLI or make sure it is available on PATH.`;
  }

  return `${label} process error: ${String(error)}`;
}
