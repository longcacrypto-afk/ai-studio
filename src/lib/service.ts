// Nghiệp vụ cho các màn: chấp nhận báo giá → tạo đơn, ghi sự kiện, đọc dữ liệu hiển thị.
// Đầu vào đều đã qua luật trong pricing.ts / order-flow.ts / job-machine.ts (đã có test).
import { tx, query } from "./db";
import { assertAcceptable, initialOrderStatus, QuoteNotAcceptable } from "./order-flow";

export const CLIENT_ID = "00000000-0000-0000-0000-0000000000c1";
export const USER_ID = "00000000-0000-0000-0000-0000000000a1";

export interface QuoteRow {
  id: string;
  code: string;
  status: string;
  total: number;
  deposit_pct: number;
  deposit_amount: number;
  valid_until: string | null;
}

export async function getQuote(code: string): Promise<QuoteRow | null> {
  const rows = await query<QuoteRow>(
    "select id, code, status, total, deposit_pct, deposit_amount, valid_until from quotes where code = $1 and customer_id = $2",
    [code, CLIENT_ID],
  );
  return rows[0] ?? null;
}

export async function listQuotes(): Promise<QuoteRow[]> {
  return query<QuoteRow>(
    "select id, code, status, total, deposit_pct, deposit_amount, valid_until from quotes where customer_id = $1 order by created_at",
    [CLIENT_ID],
  );
}

// Chấp nhận báo giá và tạo đơn ở trạng thái chờ cọc, trong một transaction.
export async function acceptQuote(code: string, now = new Date()): Promise<{ orderCode: string; depositDue: number }> {
  return tx(async (q) => {
    const rows = await q<QuoteRow & { valid_until: Date | null }>(
      "select id, code, status, total, deposit_pct, deposit_amount, valid_until from quotes where code = $1 and customer_id = $2 for update",
      [code, CLIENT_ID],
    );
    const quote = rows[0];
    if (!quote) throw new QuoteNotAcceptable("Không tìm thấy báo giá");
    assertAcceptable({ quoteStatus: quote.status as never, validUntil: quote.valid_until ? new Date(quote.valid_until) : null, now });

    const orderCode = "AIS-" + code.replace(/^Q-/, "");
    await q(
      "update quotes set status = 'accepted', accepted_at = $2, accepted_by = $3 where id = $1",
      [quote.id, now, USER_ID],
    );
    const status = initialOrderStatus(Number(quote.total), 0);
    await q(
      "insert into orders (code, customer_id, quote_id, status, total, amount_paid) values ($1, $2, $3, $4, $5, 0)",
      [orderCode, CLIENT_ID, quote.id, status, Number(quote.total)],
    );
    await q(
      "insert into order_events (order_id, from_status, to_status, actor_type, actor_id, reason) select id, null, $2, 'client', $3, 'Chấp nhận báo giá ' || $4 from orders where code = $1",
      [orderCode, status, USER_ID, code],
    );
    return { orderCode, depositDue: Number(quote.deposit_amount) };
  });
}

export interface OrderRow {
  code: string;
  status: string;
  total: number;
  amount_paid: number;
}

export async function listOrders(): Promise<OrderRow[]> {
  return query<OrderRow>("select code, status, total, amount_paid from orders where customer_id = $1 order by created_at", [CLIENT_ID]);
}

// Tạo khoản thanh toán cọc cho đơn (một khoản pending, orderCode duy nhất cho payOS).
export async function createDepositPayment(orderCode: string, amount: number, providerOrderCode: number, transferContent: string) {
  return tx(async (q) => {
    const [o] = await q<{ id: string; status: string }>("select id, status from orders where code = $1 and customer_id = $2", [orderCode, CLIENT_ID]);
    if (!o) throw new Error("Không tìm thấy đơn");
    if (o.status !== "awaiting_deposit") throw new Error("Đơn không ở trạng thái chờ cọc");
    const code = "PAY-" + providerOrderCode;
    const [p] = await q<{ code: string; provider_order_code: string }>(
      `insert into payments (code, customer_id, order_id, kind, provider, provider_order_code, transfer_content, amount_expected, status)
       values ($1, $2, $3, 'deposit', 'payos', $4, $5, $6, 'pending')
       on conflict (provider_order_code) do update set provider_order_code = excluded.provider_order_code
       returning code, provider_order_code`,
      [code, CLIENT_ID, o.id, providerOrderCode, transferContent, amount],
    );
    return { code: p.code, providerOrderCode: Number(p.provider_order_code) };
  });
}
