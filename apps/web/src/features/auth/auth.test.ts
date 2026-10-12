import { expect, test, describe } from "bun:test";
import { formatUserDisplayName, validateAuthForm } from "./api/auth-api";
import { buildClerkSyncPayload } from "./hooks/use-clerk-sync";

describe("Auth Feature Helpers", () => {
  test("formatUserDisplayName truncates name cleanly for Navbar pill", () => {
    expect(formatUserDisplayName("Budi Santoso")).toBe("Budi S.");
    expect(formatUserDisplayName("Andi")).toBe("Andi");
    expect(formatUserDisplayName("")).toBe("Pengguna");
    expect(formatUserDisplayName("Raden Mas Danang")).toBe("Raden M.");
  });

  test("validateAuthForm enforces email validity and minimum password length", () => {
    const invalidEmail = validateAuthForm("invalid-email", "password123", true, "Budi");
    expect(invalidEmail.isValid).toBe(false);
    expect(invalidEmail.error).toBe("Format email tidak valid");

    const shortPass = validateAuthForm("budi@gmail.com", "123", true, "Budi");
    expect(shortPass.isValid).toBe(false);
    expect(shortPass.error).toBe("Kata sandi minimal 6 karakter");

    const emptyName = validateAuthForm("budi@gmail.com", "password123", true, "");
    expect(emptyName.isValid).toBe(false);
    expect(emptyName.error).toBe("Nama lengkap wajib diisi");

    const validRegister = validateAuthForm("budi@gmail.com", "password123", true, "Budi");
    expect(validRegister.isValid).toBe(true);
    expect(validRegister.error).toBeNull();
  });

  describe("Clerk Sync Payload Builder", () => {
    test("builds clean sync payload from Clerk user object", () => {
      const mockClerkUser = {
        id: "user_2google_test_888",
        fullName: "Budi Santoso",
        primaryEmailAddress: { emailAddress: "budi@gmail.com" },
        imageUrl: "https://images.clerk.dev/budi.png",
      };

      const payload = buildClerkSyncPayload(mockClerkUser);
      expect(payload.id).toBe("user_2google_test_888");
      expect(payload.name).toBe("Budi Santoso");
      expect(payload.email).toBe("budi@gmail.com");
      expect(payload.avatar_url).toBe("https://images.clerk.dev/budi.png");
      expect(payload.role).toBe("customer");
    });
  });
});
