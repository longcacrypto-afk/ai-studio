# Cổng GBrain cho dự án AI Studio

GBrain là bộ nhớ chung của các agent làm dự án này. Mọi agent đọc bối cảnh và ghi kiến thức, quyết định, tiến độ vào cùng một chỗ.

- MCP URL: `https://3131-agqt7sq3wysa5r2n3rkykklbdu.instabox.tech/mcp` (Streamable HTTP, header `Authorization: Bearer <TOKEN>`)
- Client: `ai-studio-team` · quyền đọc + ghi
- Ghi vào source `ai-studio`; đọc được `ai-studio` + `default` (kiến thức chung của anh Longca)
- Token hết hạn: 26/01/2027 20:50 (UTC+7). Token KHÔNG nằm trong repo; xin anh Longca.

## Kết nối
Claude Code:
```bash
claude mcp add ai-studio-team -t http https://3131-agqt7sq3wysa5r2n3rkykklbdu.instabox.tech/mcp -H "Authorization: Bearer <TOKEN>"
```
Cursor / Windsurf / Claude Desktop / VS Code (`mcp.json`):
```json
{ "mcpServers": { "ai-studio-gbrain": {
  "url": "https://3131-agqt7sq3wysa5r2n3rkykklbdu.instabox.tech/mcp",
  "headers": { "Authorization": "Bearer <TOKEN>" } } } }
```
Codex (`~/.codex/config.toml`):
```toml
[mcp_servers.ai-studio-gbrain]
url = "https://3131-agqt7sq3wysa5r2n3rkykklbdu.instabox.tech/mcp"
http_headers = { Authorization = "Bearer <TOKEN>" }
```
OpenClaw / agent khác: thêm MCP server HTTP với URL và header như trên.

## Quy ước làm việc
1. Bắt đầu phiên: `search` / `query` "ai-studio", đọc trang `projects/ai-studio/context` và `projects/ai-studio/readme`.
2. Ghi bằng `put_page` với slug dưới `projects/ai-studio/`:
   - `projects/ai-studio/decisions/<dxx-ten>` — quyết định và lý do
   - `projects/ai-studio/progress/<yyyy-mm-dd>-<agent>` — đã làm gì, còn gì
   - `projects/ai-studio/research/<chu-de>` — kết quả research (kèm nguồn)
   - `projects/ai-studio/design/<chu-de>` — hướng UI, token, nhận xét của anh
3. Không bao giờ ghi mật khẩu, API key, token, số thẻ vào GBrain.
4. Khi trạng thái dự án đổi, cập nhật luôn `handoff/CONTEXT.md` trong repo.
