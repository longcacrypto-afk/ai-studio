import { CATALOG } from "@/lib/catalog";
import Quote from "./quote";

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";

export default function Home() {
  return (
    <main className="wrap">
      <header className="top">
        <span className="brand">AI Studio</span>
        <span className="muted">Có người duyệt trước khi giao</span>
      </header>

      <section className="hero">
        <h1>Đặt thiết kế, video AI, landing page. Báo giá rõ ràng trong vài phút.</h1>
        <p>
          Trợ lý AI nhận brief và báo giá theo bảng giá công khai. Thanh toán cọc bằng VietQR. Mọi bản giao đều do người duyệt
          trước khi gửi bạn.
        </p>
      </section>

      <section className="grid">
        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Dịch vụ</h2>
          {CATALOG.map((s) => (
            <div key={s.code} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div>
                <span className="dot" />
                <strong style={{ fontWeight: 500 }}>{s.name}</strong>
              </div>
              <div className="muted">
                Từ {fmt(s.basePrice)} · {s.includedRevisions} lượt sửa · giao gấp +{fmt(s.rushSurcharge)}
              </div>
            </div>
          ))}
          <p className="muted" style={{ marginTop: 12 }}>
            Giá đang là giá tạm, sẽ được cập nhật khi chốt bảng giá.
          </p>
        </div>

        <Quote />
      </section>
    </main>
  );
}
