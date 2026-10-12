import { describe, it, expect } from "bun:test";
import { PromoService } from "./promo.service";
import { PromoEntity } from "./entities/promo.entity";

describe("PromoService Unit Test", () => {
  it("should calculate percentage discount correctly with max cap", async () => {
    const mockPromo: Partial<PromoEntity> = {
      code: "TOKOPEDIA20",
      discount_type: "PERCENTAGE",
      discount_value: 20,
      min_purchase: 50000,
      max_discount: 25000,
      quota: 100,
      valid_until: new Date(Date.now() + 86400000), // tomorrow
    };

    const mockRepo = {
      createQueryBuilder: () => ({
        where: () => ({
          getOne: async () => mockPromo as PromoEntity,
        }),
      }),
    };

    const service = new PromoService(mockRepo as any);
    const result = await service.validatePromo({
      code: "TOKOPEDIA20",
      subtotal: 200000,
    });

    expect(result.is_valid).toBe(true);
    // 20% of 200,000 = 40,000, capped at max_discount 25,000
    expect(result.discount_amount).toBe(25000);
  });

  it("should throw error if subtotal does not meet min_purchase", async () => {
    const mockPromo: Partial<PromoEntity> = {
      code: "TOKOPEDIA20",
      discount_type: "PERCENTAGE",
      discount_value: 20,
      min_purchase: 50000,
      max_discount: 25000,
      quota: 100,
      valid_until: new Date(Date.now() + 86400000),
    };

    const mockRepo = {
      createQueryBuilder: () => ({
        where: () => ({
          getOne: async () => mockPromo as PromoEntity,
        }),
      }),
    };

    const service = new PromoService(mockRepo as any);
    expect(
      service.validatePromo({
        code: "TOKOPEDIA20",
        subtotal: 30000,
      })
    ).rejects.toThrow("Total belanja belum memenuhi syarat minimum promo");
  });
});
