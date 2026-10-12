export interface PromoRule {
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  max_discount: number;
  min_purchase: number;
}

export function calculateDiscountAmount(subtotal: number, promo: PromoRule): number {
  if (subtotal < promo.min_purchase) return 0;
  if (promo.discount_type === "PERCENTAGE") {
    const calc = Math.round((subtotal * promo.discount_value) / 100);
    return promo.max_discount > 0 && calc > promo.max_discount ? promo.max_discount : calc;
  }
  return promo.discount_value;
}
