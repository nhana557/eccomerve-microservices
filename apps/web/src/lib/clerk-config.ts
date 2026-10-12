/**
 * Utility to verify whether Clerk Publishable Key is properly configured
 * and not a dummy/placeholder string.
 */
export function isClerkEnabled(
  customKey?: string
): boolean {
  const key =
    customKey !== undefined
      ? customKey
      : process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!key || typeof key !== "string") {
    return false;
  }

  const trimmed = key.trim();
  if (
    trimmed === "" ||
    trimmed.includes("placeholder") ||
    trimmed.includes("xxxx")
  ) {
    return false;
  }

  // Must start with pk_test_ or pk_live_
  if (!trimmed.startsWith("pk_test_") && !trimmed.startsWith("pk_live_")) {
    return false;
  }

  // Valid base64 publishable keys in Clerk are at least 35 characters
  if (trimmed.length < 35) {
    return false;
  }

  return true;
}
