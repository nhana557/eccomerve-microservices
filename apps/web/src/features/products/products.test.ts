import { expect, test, describe } from "bun:test";
import {
  filterProducts,
  appendUniqueProducts,
  calculateHasMore,
  DEFAULT_PAGE_SIZE,
} from "./hooks/use-products";
import { Product } from "./types";
import {
  calculateOriginalPrice,
  formatSalesCount,
  formatCountdown,
  getProductImage,
  DEFAULT_PRODUCT_FALLBACK,
  handleProductImageError,
  getQuickCategoryActiveId,
  formatRupiah,
  parseRupiahInput,
  PRICE_PRESETS,
  STOCK_PRESETS,
  countActiveFilters,
  formatPriceRangeLabel,
  formatStockFilterLabel,
} from "./utils/tokopedia-helpers";

const mockProducts: Product[] = [
  {
    id: "p1",
    name: "Mechanical Keyboard",
    description: "RGB Hot-swap keyboard",
    price: 1250000,
    stock: 20,
    category: "Electronics",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "p2",
    name: "Wireless Mouse",
    description: "Ergonomic gaming mouse",
    price: 650000,
    stock: 5,
    category: "Electronics",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "p3",
    name: "Cotton Hoodie",
    description: "Comfortable oversized hoodie",
    price: 350000,
    stock: 15,
    category: "Apparel",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("Product Feature Logic", () => {
  test("filterProducts filters by category correctly", () => {
    const result = filterProducts(mockProducts, "Apparel", "");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Cotton Hoodie");
  });

  test("filterProducts filters by search query case-insensitively", () => {
    const result = filterProducts(mockProducts, "All", "keyboard");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("p1");
  });

  test("filterProducts returns all when category is All and query is empty", () => {
    const result = filterProducts(mockProducts, "All", "");
    expect(result.length).toBe(3);
  });

  test("filterProducts filters by category_id correctly", () => {
    const productsWithCatId: Product[] = [
      { ...mockProducts[0], category_id: "cat-elec-1" },
      { ...mockProducts[1], category_id: "cat-elec-2" },
      { ...mockProducts[2], category_id: "cat-app-1" },
    ];
    const result = filterProducts(productsWithCatId, "All", "", "cat-elec-1");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("p1");
  });

  test("filterProducts filters by price range correctly", () => {
    // p1: 1.250.000, p2: 650.000, p3: 350.000
    const result = filterProducts(mockProducts, "All", "", undefined, 500000, 1000000);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("p2");
  });

  test("filterProducts filters by min stock correctly", () => {
    const productsWithStock: Product[] = [
      ...mockProducts,
      {
        id: "p4",
        name: "Bulk Gaming Mousepad",
        description: "Large desk mat",
        price: 150000,
        stock: 125,
        category: "Accessories",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    const result = filterProducts(productsWithStock, "All", "", undefined, undefined, undefined, 100);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("p4");
    expect(result[0].stock).toBe(125);
  });

  describe("Pagination Helpers", () => {
    test("appendUniqueProducts combines new batch avoiding duplicate IDs", () => {
      const existing = [mockProducts[0], mockProducts[1]];
      const incoming = [
        mockProducts[1], // duplicate
        mockProducts[2], // new
        { ...mockProducts[0], id: "p4", name: "New Product" }, // new
      ];
      const result = appendUniqueProducts(existing, incoming);
      expect(result.length).toBe(4);
      expect(result.map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4"]);
    });

    test("calculateHasMore returns true only when current count is less than total", () => {
      expect(calculateHasMore(50, 1000000)).toBe(true);
      expect(calculateHasMore(100, 100)).toBe(false);
      expect(calculateHasMore(150, 100)).toBe(false);
      expect(calculateHasMore(0, 0)).toBe(false);
    });

    test("DEFAULT_PAGE_SIZE is 60 and divisible evenly across all grid columns (2, 3, 4, 5, 6)", () => {
      expect(DEFAULT_PAGE_SIZE).toBe(60);
      expect(DEFAULT_PAGE_SIZE % 2).toBe(0); // Mobile (2 cols)
      expect(DEFAULT_PAGE_SIZE % 3).toBe(0); // Tablet sm (3 cols)
      expect(DEFAULT_PAGE_SIZE % 4).toBe(0); // Tablet/Laptop md (4 cols)
      expect(DEFAULT_PAGE_SIZE % 5).toBe(0); // Desktop lg (5 cols)
      expect(DEFAULT_PAGE_SIZE % 6).toBe(0); // Wide Desktop xl (6 cols - matches screenshot)
    });
  });

  describe("Tokopedia Visual Helpers", () => {
    test("calculateOriginalPrice calculates crossed-out original price correctly", () => {
      // If current price is 1.000.000 with 20% discount, original = 1.250.000
      const original = calculateOriginalPrice(1000000, 20);
      expect(original).toBe(1250000);
    });

    test("calculateOriginalPrice returns same price when discount is 0 or invalid", () => {
      expect(calculateOriginalPrice(500000, 0)).toBe(500000);
      expect(calculateOriginalPrice(500000, 100)).toBe(500000);
    });

    test("formatSalesCount formats Indonesian e-commerce sales badge properly", () => {
      expect(formatSalesCount(45)).toBe("45 terjual");
      expect(formatSalesCount(250)).toBe("250+ terjual");
      expect(formatSalesCount(1450)).toBe("1rb+ terjual");
      expect(formatSalesCount(25400)).toBe("10rb+ terjual");
    });

    test("formatCountdown splits seconds into padded hours, minutes, seconds", () => {
      const { hours, minutes, seconds } = formatCountdown(3665);
      expect(hours).toBe("01");
      expect(minutes).toBe("01");
      expect(seconds).toBe("05");
    });

    test("getProductImage returns explicit image_url if provided", () => {
      const customImg = "https://custom.com/image.jpg";
      const product = { ...mockProducts[0], image_url: customImg };
      expect(getProductImage(product)).toBe(customImg);
    });

    test("getProductImage returns verified Shopee CDN image when category_id is provided", () => {
      const product = { ...mockProducts[0], category_id: "sub-audio", image_url: undefined };
      const img = getProductImage(product);
      expect(img.includes("susercontent.com")).toBe(true);
    });

    test("getProductImage bypasses broken Tokopedia signed CDN image and resolves to verified Shopee CDN image", () => {
      const signedTokopediaImg = "https://p16-images-sign-sg.tokopedia-static.net/tos-alisg/sample.jpeg?x-expires=123";
      const product = { ...mockProducts[0], category_id: "sub-tv", image_url: signedTokopediaImg };
      const img = getProductImage(product);
      expect(img.includes("susercontent.com")).toBe(true);
      expect(img.includes("tokopedia-static.net")).toBe(false);
    });

    test("getProductImage returns matched Unsplash photo for keyboard", () => {
      const img = getProductImage(mockProducts[0]);
      expect(img.startsWith("https://images.unsplash.com/")).toBe(true);
    });

    test("DEFAULT_PRODUCT_FALLBACK points to valid svg fallback", () => {
      expect(DEFAULT_PRODUCT_FALLBACK).toBe("/images/default-product.svg");
    });

    test("handleProductImageError replaces target src with default fallback image", () => {
      const mockImg = {
        src: "https://broken-url.com/nonexistent.jpg",
        dataset: {},
      } as any;
      handleProductImageError({ currentTarget: mockImg } as any);
      expect(mockImg.src).toBe("/images/default-product.svg");
      expect(mockImg.dataset.fallbackTried).toBe("true");

      // Second failure triggers data URL fallback
      handleProductImageError({ currentTarget: mockImg } as any);
      expect(mockImg.src.startsWith("data:image/svg+xml")).toBe(true);
      expect(mockImg.dataset.dataUrlTried).toBe("true");
    });

    test("getQuickCategoryActiveId maps categories and filters to single unique quick id", () => {
      expect(getQuickCategoryActiveId("Electronics")).toBe("elec");
      expect(getQuickCategoryActiveId("Elektronik")).toBe("elec");
      expect(getQuickCategoryActiveId("Komputer & Laptop")).toBe("acc");
      expect(getQuickCategoryActiveId("Fashion Pria")).toBe("apparel");
      expect(getQuickCategoryActiveId("Apparel")).toBe("apparel");
      expect(getQuickCategoryActiveId("Accessories")).toBe("acc");
      expect(getQuickCategoryActiveId("All")).toBe("all");
      expect(getQuickCategoryActiveId("All", "official")).toBe("os");
      expect(getQuickCategoryActiveId("All", "free-shipping")).toBe("ongkir");
    });

    test("formatRupiah formats numbers into Indonesian currency strings", () => {
      expect(formatRupiah(0)).toBe("Rp 0");
      expect(formatRupiah(150000)).toBe("Rp 150.000");
      expect(formatRupiah(2500000)).toBe("Rp 2.500.000");
    });

    test("parseRupiahInput extracts clean number from raw inputs", () => {
      expect(parseRupiahInput("Rp 150.000")).toBe(150000);
      expect(parseRupiahInput("2.500.000")).toBe(2500000);
      expect(parseRupiahInput("50000")).toBe(50000);
      expect(parseRupiahInput("abc")).toBe(0);
      expect(parseRupiahInput("")).toBe(0);
    });

    test("PRICE_PRESETS and STOCK_PRESETS provide standard Tokopedia filters", () => {
      expect(PRICE_PRESETS.length).toBeGreaterThanOrEqual(4);
      expect(PRICE_PRESETS[0].label).toBe("< 100rb");
      expect(PRICE_PRESETS[0].max).toBe(100000);

      expect(STOCK_PRESETS.length).toBeGreaterThanOrEqual(3);
      const stock100 = STOCK_PRESETS.find((s) => s.min === 100);
      expect(stock100).toBeDefined();
      expect(stock100?.label).toBe("Stok > 100");
    });

    test("countActiveFilters counts active filters excluding defaults", () => {
      expect(countActiveFilters({})).toBe(0);
      expect(countActiveFilters({ category: "All" })).toBe(0);
      expect(countActiveFilters({ category: "Elektronik" })).toBe(1);
      expect(countActiveFilters({ categoryId: "cat-1" })).toBe(1);
      expect(countActiveFilters({ minPrice: 100000 })).toBe(1);
      expect(countActiveFilters({ minPrice: 100000, maxPrice: 500000 })).toBe(1); // price counts as 1 filter
      expect(countActiveFilters({ minStock: 100 })).toBe(1);
      expect(countActiveFilters({ categoryId: "cat-1", minPrice: 50000, minStock: 100 })).toBe(3);
    });

    test("formatPriceRangeLabel creates clear badges for price filters", () => {
      expect(formatPriceRangeLabel(100000, 500000)).toBe("Rp 100.000 - Rp 500.000");
      expect(formatPriceRangeLabel(100000, undefined)).toBe("≥ Rp 100.000");
      expect(formatPriceRangeLabel(undefined, 500000)).toBe("≤ Rp 500.000");
      expect(formatPriceRangeLabel(undefined, undefined)).toBe("");
    });

    test("formatStockFilterLabel formats stock badge accurately", () => {
      expect(formatStockFilterLabel(100)).toBe("Stok ≥ 100");
      expect(formatStockFilterLabel(0)).toBe("");
      expect(formatStockFilterLabel(undefined)).toBe("");
    });
  });
});
