// Khóa payOS đọc từ biến môi trường. Thiếu thì báo rõ, không bao giờ dùng khóa giả trên production.
import type { PayosConfig } from "./payos";

export function payosConfig(): PayosConfig | null {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!clientId || !apiKey || !checksumKey) return null;
  return { clientId, apiKey, checksumKey };
}
