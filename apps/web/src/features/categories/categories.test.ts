import { expect, test, describe } from "bun:test";
import { Category } from "./types";
import { flattenCategories, findCategoryByIdOrSlug, findParentCategory } from "./hooks/use-categories";
import {
  DEFAULT_CATEGORY_FALLBACK,
  DEFAULT_CATEGORY_DATA_URL,
  handleCategoryImageError,
} from "./utils/category-helpers";

const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "Elektronik",
    slug: "elektronik",
    level: 1,
    children: [
      { id: "cat-1-1", name: "Audio", slug: "audio", level: 2, parent_id: "cat-1" },
      { id: "cat-1-2", name: "Kamera", slug: "kamera", level: 2, parent_id: "cat-1" },
    ],
  },
  {
    id: "cat-2",
    name: "Komputer",
    slug: "komputer",
    level: 1,
    children: [],
  },
];

describe("Category Helpers", () => {
  test("flattenCategories extracts all categories into a flat list", () => {
    const flat = flattenCategories(mockCategories);
    expect(flat.length).toBe(4);
    expect(flat.map((c) => c.slug)).toEqual(["elektronik", "audio", "kamera", "komputer"]);
  });

  test("findCategoryByIdOrSlug finds top-level and subcategories", () => {
    const found1 = findCategoryByIdOrSlug(mockCategories, "cat-1");
    expect(found1?.name).toBe("Elektronik");

    const found2 = findCategoryByIdOrSlug(mockCategories, "audio");
    expect(found2?.name).toBe("Audio");

    const notFound = findCategoryByIdOrSlug(mockCategories, "unknown");
    expect(notFound).toBeUndefined();
  });

  test("findParentCategory locates parent of a subcategory", () => {
    const parent = findParentCategory(mockCategories, "cat-1-2");
    expect(parent?.id).toBe("cat-1");
    expect(parent?.name).toBe("Elektronik");

    const none = findParentCategory(mockCategories, "cat-1");
    expect(none).toBeUndefined();
  });

  describe("Category Image Fallback", () => {
    test("DEFAULT_CATEGORY_FALLBACK points to valid svg fallback", () => {
      expect(DEFAULT_CATEGORY_FALLBACK).toBe("/images/default-category.svg");
    });

    test("handleCategoryImageError replaces broken category icon with fallback and then data URL", () => {
      const mockImg = {
        src: "https://broken-category-icon.com/icon.png",
        dataset: {},
      } as any;

      // 1st error triggers local default SVG fallback
      handleCategoryImageError({ currentTarget: mockImg } as any);
      expect(mockImg.src).toBe("/images/default-category.svg");
      expect(mockImg.dataset.fallbackTried).toBe("true");

      // 2nd error triggers inline data URL fallback (offline resilience)
      handleCategoryImageError({ currentTarget: mockImg } as any);
      expect(mockImg.src.startsWith("data:image/svg+xml")).toBe(true);
      expect(mockImg.dataset.dataUrlTried).toBe("true");
    });
  });
});
