import { describe, it, expect } from "vitest";
import { price, type ServiceVersion } from "../src/lib/pricing";

const logo: ServiceVersion = {
  code: "logo",
  name: "Logo tối giản",
  basePrice: 990_000,
  rushSurcharge: 300_000,
  includedRevisions: 3,
  options: [{ code: "mini", label: "Bộ nhận diện mini", price: 300_000 }],
};

describe("price()", () => {
  it("tính tạm tính và cọc 50% theo giá prototype (logo + bộ nhận diện mini)", () => {
    const r = price({ service: logo, optionCodes: ["mini"], smallOrderThreshold: 0 });
    expect(r.subtotal).toBe(1_290_000);
    expect(r.total).toBe(1_290_000);
    expect(r.depositPct).toBe(50);
    expect(r.depositAmount).toBe(645_000);
  });

  it("đơn nhỏ hơn ngưỡng thu 100% cọc", () => {
    const r = price({ service: logo, smallOrderThreshold: 2_000_000 });
    expect(r.depositPct).toBe(100);
    expect(r.depositAmount).toBe(990_000);
  });

  it("nhân số lượng và cộng phụ phí giao gấp", () => {
    const r = price({ service: logo, qty: 2, rush: true, smallOrderThreshold: 0 });
    expect(r.items.map((i) => i.amount)).toEqual([1_980_000, 300_000]);
    expect(r.subtotal).toBe(2_280_000);
  });

  it("giảm giá theo gói và làm tròn", () => {
    const r = price({ service: logo, planDiscountPct: 10, smallOrderThreshold: 0 });
    expect(r.discount).toBe(99_000);
    expect(r.total).toBe(891_000);
    expect(r.depositAmount).toBe(445_500);
  });

  it("từ chối tùy chọn không tồn tại và qty không hợp lệ", () => {
    expect(() => price({ service: logo, optionCodes: ["nope"] })).toThrow();
    expect(() => price({ service: logo, qty: 0 })).toThrow();
    expect(() => price({ service: logo, qty: 1.5 })).toThrow();
  });

  it("từ chối giảm giá ngoài 0–100%", () => {
    expect(() => price({ service: logo, planDiscountPct: 120 })).toThrow();
  });
});
