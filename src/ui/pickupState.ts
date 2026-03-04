export type ExpiryState = "active" | "expiring" | "expired";

export function describeExpiryState(secondsLeft: number): ExpiryState {
  if (secondsLeft <= 0) return "expired";
  if (secondsLeft <= 30) return "expiring";
  return "active";
}
