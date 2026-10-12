import { expect, test, describe } from "bun:test";
import { isClerkEnabled } from "./clerk-config";

describe("Clerk Configuration Helper", () => {
  test("returns false when key is undefined or empty", () => {
    expect(isClerkEnabled(undefined)).toBe(false);
    expect(isClerkEnabled("")).toBe(false);
  });

  test("returns false when key is placeholder or invalid prefix", () => {
    expect(isClerkEnabled("pk_test_placeholder")).toBe(false);
    expect(isClerkEnabled("sk_test_123456789012345678901234567890")).toBe(false);
    expect(isClerkEnabled("invalid_key_string")).toBe(false);
  });

  test("returns true when key is valid Clerk publishable key", () => {
    const validDevKey = "pk_test_Y29vbC10aWdlci00Mi5jbGVyay5hY2NvdW50cy5kZXYk";
    expect(isClerkEnabled(validDevKey)).toBe(true);

    const validProdKey = "pk_live_Y29vbC10aWdlci00Mi5jbGVyay5hY2NvdW50cy5kZXYk";
    expect(isClerkEnabled(validProdKey)).toBe(true);
  });
});
