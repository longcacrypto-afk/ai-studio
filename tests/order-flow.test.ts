import { describe, it, expect } from "vitest";
import { assertAcceptable, initialOrderStatus, QuoteNotAcceptable } from "../src/lib/order-flow";

const now = new Date("2026-10-28T12:00:00Z");

describe("chấp nhận báo giá", () => {
  it("cho phép chấp nhận báo giá đã gửi, còn hạn", () => {
    expect(() =>
      assertAcceptable({ quoteStatus: "sent", validUntil: new Date("2026-10-30T16:59:00Z"), now }),
    ).not.toThrow();
  });

  it("chặn báo giá đã chấp nhận (không tạo đơn trùng)", () => {
    expect(() => assertAcceptable({ quoteStatus: "accepted", validUntil: null, now })).toThrow(QuoteNotAcceptable);
  });

  it("chặn báo giá hết hạn", () => {
    expect(() =>
      assertAcceptable({ quoteStatus: "sent", validUntil: new Date("2026-10-27T00:00:00Z"), now }),
    ).toThrow(/hết hạn/);
  });

  it("chặn báo giá đã bị thay thế hoặc từ chối", () => {
    expect(() => assertAcceptable({ quoteStatus: "superseded", validUntil: null, now })).toThrow(QuoteNotAcceptable);
    expect(() => assertAcceptable({ quoteStatus: "rejected", validUntil: null, now })).toThrow(QuoteNotAcceptable);
  });
});

describe("trạng thái đơn ban đầu", () => {
  it("không có credit thì chờ cọc", () => {
    expect(initialOrderStatus(1_290_000)).toBe("awaiting_deposit");
  });

  it("credit đủ trả 100% thì xác nhận ngay", () => {
    expect(initialOrderStatus(1_290_000, 2_000_000)).toBe("confirmed");
  });
});
