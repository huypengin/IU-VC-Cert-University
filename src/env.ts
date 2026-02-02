export function getEnv(name: string): string {
  const value = (__IU_ENV__ as Record<string, string | undefined>)[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}
