# AI Studio — Bàn giao cho AI agent tiếp theo

Cập nhật: 2026-10-28. Chủ dự án: anh Longca (gọi "anh", agent xưng "em", trả lời tiếng Việt).

## 1. Ý tưởng
Một **AI freelancer / studio sáng tạo AI** công khai cho doanh nghiệp nhỏ Việt Nam:
- Khách đặt việc: thiết kế (logo, post, bộ nhận diện qua Canva/Figma), video AI (Seedance), landing page / WordPress / Flatsome.
- AI agent nhận brief, hỏi thêm, **báo giá theo bảng giá/rule trong DB** (AI không tự bịa giá), thuyết phục, thu tiền bằng **VietQR động** + webhook.
- Worker agent nội bộ (OpenClaw) thực hiện bằng tool của anh; **anh duyệt (QA) trước khi giao**.
- Khách theo dõi tiến độ live trên portal: chat, báo giá, thanh toán, timeline, bản nháp, góp ý sửa, hóa đơn, tải file.
- Đã làm rõ: KHÔNG phải sản phẩm chatbot bán hàng cho shop.
- Tầm nhìn phase 3: **marketplace** — bên thứ ba đăng ký tool/agent (A2A Agent Card, MCP) để nhận job; OpenClaw nội bộ là provider đầu tiên. Thiết kế v1 để worker là provider cắm-rút được.

## 2. Kiến trúc đã chốt hướng
- Portal/API công khai **tách hoàn toàn** khỏi OpenClaw. OpenClaw là mô hình 1 operator tin cậy, không multi-tenant; khách không bao giờ nói chuyện trực tiếp với gateway có tool.
- Luồng: portal + agent intake/sales sandbox (chỉ có tool báo giá/đơn/thanh toán) → hàng đợi job (đề xuất Supabase Queues/pgmq) → worker OpenClaw (Canva/Figma MCP, Seedance API, skill WordPress) → QA người → giao hàng.
- Brief gửi worker là **JSON chuẩn hóa**.
- Thanh toán chỉ xác nhận bằng webhook đã verify + re-check trạng thái + idempotency; không tin ảnh chụp chuyển khoản.
- Model theo tầng (giá 10/2026): chat/router rẻ (Qwen3.7 Flash, DeepSeek V4 Flash, Haiku 5.5, GPT-6 Luna, Gemini Flash-Lite); worker (Sonnet 5.5, GPT-6 Sol, Qwen3.7 Max); lập kế hoạch khó (Opus 5.5). Qua OpenRouter hoặc trực tiếp. Giám sát LiteLLM + Langfuse.
- Bộ nhớ: GBrain tự host của anh cho know-how studio; trí nhớ từng khách ở Postgres/pgvector; workspace memory của OpenClaw.
- Provider marketplace chạy trên hạ tầng riêng, không chạy agent không tin cậy trên OpenClaw Gateway; escrow qua đối tác được cấp phép.

## 3. Quyết định đang chờ anh chốt (xem docs/02-spec.md §9)
- D1 cổng thanh toán: payOS hay SePay (đề xuất payOS phase 1).
- D2 cọc: đề xuất 50%, trả phần còn lại trước khi mở file final.
- D6 queue: đề xuất Supabase Queues/pgmq.
- D10 ngân sách model: khoảng 10–15% giá job; Seedance có tính vào trần hay không.

## 4. Kiến thức đã research (tái sử dụng)
- Canva Education chỉ dùng phi thương mại → cần tài khoản Canva trả phí cho việc làm cho khách. Autofill qua API/MCP cần Pro+ (một số tool MCP chỉ Enterprise). Figma MCP ghi được lên canvas (beta).
- Seedance 2.5 trên BytePlus ≈ $1,156 / 5s 720p; 2.0 Mini ≈ $0,38 / 5s; nạp $30 để kích hoạt.
- payOS miễn phí; SePay miễn phí 50 giao dịch/tháng, VietQR 200–500đ/giao dịch.
- Fiverr Go AI Personal Assistant đóng 01/10/2026; Fiverr AI Video Hub ra mắt 03/2026.
- Chi tiết: docs/01-research-bo-sung.md.

## 5. UI / thiết kế
- Prototype v1 (prototype/v1): anh chê "xấu và thô".
- v2 vòng 1 (nhiều thẻ, gradient, màu theo dịch vụ, donut — theo 3 ảnh tham khảo Nexora/Trackline/dashboard tối): anh chê "rối, quá AI, chưa xịn".
- v2 hiện tại (prototype/v2): hướng **"quiet workspace" kiểu Linear/Attio** — nền trắng, một màu nhấn #5e5ce6, font Geist (+ Geist Mono cho mã/tiền), hairline #ebebeb, bỏ gradient/emoji/thẻ trang trí, màu dịch vụ chỉ là chấm 8px. Đang chờ anh nhận xét. Lưu ý: bản trong repo có thể chưa phải lần sửa cuối.
- Màn đã có ở v2: C-02 Tổng quan khách hàng, P-02 Chat với trợ lý AI. Kế hoạch tiếp: C-09 timeline (Gantt) + C-10 duyệt bản nháp, C-06 thanh toán + P-01 landing, admin A-02/A-03/A-08, provider V-02/V-04.
- Nguyên tắc: client mobile-first, admin desktop-first; mỗi màn có trạng thái loading/empty/error; tiếng Việt line-height ≥1.5 body, ≥1.2 tiêu đề; tiền viết "1.290.000đ"; giá trong prototype là giá tạm.
- 4 agent persona: Mai · Thiết kế, Khoa · Video, Minh · Web, Lan · Kiểm tra chất lượng (avatar trong design/assets).

## 6. Bước tiếp theo đề xuất
1. Anh duyệt hướng UI v2 → làm các màn còn lại.
2. Anh chốt D1/D2/D6/D10.
3. Dựng khung code (đề xuất Next.js + Supabase) theo docs/02-spec.md.
4. Triển khai OpenClaw trên server của anh (prized.dev hoặc instabox) theo mô hình tách portal/worker.

## 7. Về anh Longca (để làm việc trơn tru)
- Người Việt, xây sản phẩm bằng AI và công cụ no-code/dev (Lovable, FlutterFlow, Supabase, Cloudflare Workers).
- Thích kết quả có gu, chuyên nghiệp; không thích UI generic kiểu "AI làm".
- Ưu tiên hạ tầng trước, menu dịch vụ sau.

## File
- docs/01-research-bo-sung.md — research
- docs/02-spec.md — spec chi tiết (M01–M18, ~45 bảng, 58 màn, state machine, API, bảo mật, D1–D22)
- handoff/chat-history.md — lịch sử trò chuyện đầy đủ
- prototype/ — UI prototype; design/assets/ — ảnh
