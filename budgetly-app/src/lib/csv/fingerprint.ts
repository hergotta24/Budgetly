/**
 * Deterministic duplicate fingerprints.
 *
 * Two rows are considered the same transaction when their normalized date,
 * description, amount and account all match. The fingerprint is the joined
 * normalized key rather than a hash, so it can never produce a false duplicate
 * through a collision — silently dropping a real transaction would be worse than
 * storing a slightly longer string.
 */

/** Lowercases, collapses whitespace and trims a description for comparison. */
export function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Normalizes an account name for comparison. */
export function normalizeAccountName(account: string): string {
  return account.trim().toLowerCase().replace(/\s+/g, " ");
}

export type FingerprintInput = {
  /** `YYYY-MM-DD`. */
  date: string;
  description: string;
  /** Signed integer cents. */
  amountCents: number;
  /** Account display name. */
  account: string;
};

export function buildFingerprint(input: FingerprintInput): string {
  return [
    input.date,
    normalizeDescription(input.description),
    String(input.amountCents),
    normalizeAccountName(input.account),
  ].join("|");
}
