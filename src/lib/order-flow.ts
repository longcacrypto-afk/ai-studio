// Luật chấp nhận báo giá → tạo đơn (spec BR-QUOTE-02, ORDER-7). Hàm thuần: nhận dữ liệu, trả về kế hoạch ghi DB.
import type { PriceResult } from "./pricing";

export type QuoteStatus = "draft" | "sent" | "accepted" | "expired" | "superseded" | "rejected";

export class QuoteNotAcceptable extends Error {}

export interface AcceptInput {
  quoteStatus: QuoteStatus;
  validUntil: Date | null;
  now: Date;
  creditBalance?: number; // số dư credit của khách (gói tháng)
}

// Chỉ quote còn hiệu lực, chưa chấp nhận, chưa bị thay thế mới được chấp nhận.
export function assertAcceptable(q: AcceptInput): void {
  if (q.quoteStatus === "accepted") throw new QuoteNotAcceptable("Báo giá đã được chấp nhận");
  if (q.quoteStatus !== "sent") throw new QuoteNotAcceptable(`Báo giá ở trạng thái ${q.quoteStatus} không thể chấp nhận`);
  if (q.validUntil && q.now.getTime() > q.validUntil.getTime()) {
    throw new QuoteNotAcceptable("Báo giá đã hết hạn, hãy yêu cầu báo giá lại");
  }
}

// Đơn mới luôn bắt đầu ở awaiting_deposit; chỉ chuyển confirmed khi webhook xác nhận cọc (spec §4.2).
// Nếu credit đủ trả 100% thì có thể confirmed ngay.
export function initialOrderStatus(total: number, creditBalance = 0): "awaiting_deposit" | "confirmed" {
  return creditBalance >= total ? "confirmed" : "awaiting_deposit";
}

// Số tiền cọc cần thu, lấy trực tiếp từ engine báo giá.
export function depositDue(price: PriceResult): number {
  return price.depositAmount;
}
