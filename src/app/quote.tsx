"use client";

import { useEffect, useState } from "react";
import { CATALOG } from "@/lib/catalog";

type QuoteResult = {
  items: { label: string; quantity: number; unitPrice: number; amount: number }[];
  subtotal: number;
  discount: number;
  total: number;
  depositPct: number;
  depositAmount: number;
  revisions: number;
};

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";

export default function Quote() {
  const [service, setService] = useState(CATALOG[0].code);
  const [mini, setMini] = useState(false);
  const [rush, setRush] = useState(false);
  const [qty, setQty] = useState(1);
  const [data, setData] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ service, optionCodes: mini ? ["mini"] : [], rush, qty }),
      signal: controller.signal,
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Không tính được báo giá");
        setData(body);
        setError(null);
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Lỗi không xác định");
        setData(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [service, mini, rush, qty]);

  return (
    <div className="card">
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Báo giá nhanh</h2>
      <div className="field">
        <label htmlFor="svc">Dịch vụ</label>
        <select id="svc" value={service} onChange={(e) => setService(e.target.value)}>
          {CATALOG.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="qty">Số lượng</label>
        <input id="qty" type="number" min={1} step={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
      </div>
      <label className="check">
        <input type="checkbox" checked={mini} onChange={(e) => setMini(e.target.checked)} /> Thêm bộ nhận diện mini
      </label>
      <label className="check">
        <input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} /> Giao gấp
      </label>

      {error && <p className="err">{error}</p>}
      {!error && !data && <p className="muted">{loading ? "Đang tính…" : "Chọn dịch vụ để xem báo giá."}</p>}

      {data && (
        <>
          <table className="rows">
            <tbody>
              {data.items.map((i) => (
                <tr key={i.label}>
                  <td>
                    {i.label}
                    {i.quantity > 1 ? ` × ${i.quantity}` : ""}
                  </td>
                  <td>{fmt(i.amount)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Tổng</td>
                <td>{fmt(data.total)}</td>
              </tr>
              <tr>
                <td>Cọc {data.depositPct}%</td>
                <td>{fmt(data.depositAmount)}</td>
              </tr>
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 10 }}>
            {data.revisions} lượt sửa miễn phí. Bản giao được người duyệt trước khi gửi.
          </p>
          <button className="btn" style={{ marginTop: 12 }} disabled title="Thanh toán payOS chưa được cấu hình">
            Chấp nhận & thanh toán cọc
          </button>
          <p className="muted" style={{ marginTop: 6 }}>
            Thanh toán payOS sẽ bật khi có khóa API.
          </p>
        </>
      )}
    </div>
  );
}
