# AI Studio

AI freelancer / AI creative studio cho SMEs Việt Nam: khách đặt thiết kế (Canva/Figma), video AI (Seedance), landing page/WordPress; AI agent nhận brief, báo giá, thu tiền VietQR; worker OpenClaw nội bộ thực thi; chủ studio duyệt trước khi giao.

## Nội dung
- `docs/01-research-bo-sung.md` — research thị trường, pháp lý, hạ tầng, marketplace
- `docs/02-spec.md` — spec: 18 module, ~45 bảng, 58 màn hình, state machine, API, bảo mật, quyết định D1–D22
- `prototype/v1/` — prototype UI bản đầu
- `prototype/v2/` — prototype UI bản "quiet workspace" (mở `index.html`)
- `design/assets/` — ảnh hero, avatar agent

## Quyết định đang chờ
D1 cổng thanh toán (payOS/SePay) · D2 tỷ lệ cọc · D6 queue · D10 ngân sách model

## Chạy ứng dụng (lát MVP đầu tiên)

Đã có: engine báo giá (`src/lib/pricing.ts`), state machine job (`src/lib/job-machine.ts`), trang chủ và báo giá nhanh (`src/app/`), API `POST /api/quote`.
Chưa có: database và thanh toán payOS, đăng nhập, chat AI, worker OpenClaw, admin. Xem `docs/02-spec.md` để biết phạm vi.

```bash
npm install
npm test        # 16 test lõi nghiệp vụ
npm run typecheck
npm run build
npm start
```

Giá trong catalog là giá tạm từ prototype, chưa phải bảng giá chốt.
