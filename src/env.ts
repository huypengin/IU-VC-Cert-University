export function getEnv(name: string, fallback?: string): string {
  if (typeof window !== "undefined") {
    const sessionVal = sessionStorage.getItem(name);
    if (sessionVal !== null && sessionVal !== undefined && sessionVal !== "") return sessionVal;
  }
  const value = (__IU_ENV__ as Record<string, string | undefined>)[name] ?? fallback;
  if (value === undefined || value === null) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

