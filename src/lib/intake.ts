// Trợ lý tiếp nhận brief bằng luật cố định (chưa có khóa model). Giá CHỈ lấy từ engine báo giá, không bao giờ do chat tự nói ra.
import { price } from "./pricing";
import { findService } from "./catalog";

export interface IntakeState {
  service?: string;
  product?: string;
  style?: string;
  deadlineHours?: number;
  brand?: string;
}

export interface IntakeReply {
  text: string;
  state: IntakeState;
  quote?: { total: number; deposit: number; items: { label: string; amount: number }[] };
  handoff?: boolean;
}

const SERVICE_WORDS: [RegExp, string][] = [
  [/logo|nhận diện|nhan dien/i, "logo"],
];

export function nextReply(message: string, state: IntakeState = {}): IntakeReply {
  const m = message.trim();
  const next: IntakeState = { ...state };

  // Người dùng muốn gặp người thật
  if (/người thật|nói chuyện với người|chuyên viên/i.test(m)) {
    return { text: "Em đã chuyển cuộc trò chuyện cho chuyên viên. Họ sẽ phản hồi trong giờ làm việc ạ.", state: next, handoff: true };
  }

  // Lấy dịch vụ
  if (!next.service) {
    const hit = SERVICE_WORDS.find(([re]) => re.test(m));
    if (hit) next.service = hit[1];
  }

  if (!next.service) {
    return { text: "Chị đang cần làm gì ạ? Hiện em nhận báo giá logo tối giản và bộ nhận diện mini.", state: next };
  }

  if (!next.brand) {
    const b = m.match(/(?:thương hiệu|tên|quán|shop)\s*(?:là|:)?\s*([\p{L}\d][\p{L}\d\s]{1,40})/iu);
    if (b && !/logo|nhận diện/i.test(b[1])) next.brand = b[1].trim();
    if (!next.brand && state.service === undefined) {
      return { text: "Thương hiệu của chị tên gì ạ?", state: next };
    }
  }

  if (!next.brand) {
    next.brand = m.length <= 40 ? m : undefined;
    if (!next.brand) return { text: "Chị cho em tên thương hiệu nhé?", state: next };
  }

  if (!next.style) {
    const s = m.match(/tối giản|hiện đại|cổ điển|vui|sang|tự nhiên/i);
    if (s) next.style = s[0].toLowerCase();
    else return { text: `Dạ, ${next.brand}. Chị muốn phong cách như thế nào ạ? (tối giản, hiện đại, cổ điển, vui hay sang)`, state: next };
  }

  if (!next.deadlineHours) {
    const h = m.match(/(\d+)\s*(giờ|h|ngày)/i);
    if (h) next.deadlineHours = h[2] === "ngày" ? Number(h[1]) * 24 : Number(h[1]);
    else return { text: "Chị cần giao trong bao lâu ạ? Mặc định 48 giờ nếu chị không chọn.", state: { ...next, deadlineHours: 0 } };
  }

  // Đủ brief: báo giá lấy từ engine
  const svc = findService("logo")!;
  const r = price({ service: svc, optionCodes: ["mini"], smallOrderThreshold: 0 });
  return {
    text: `Em đã ghi brief: ${next.brand}, phong cách ${next.style}. Đây là báo giá của chị. Chuyên viên sẽ duyệt lại trước khi chốt.`,
    state: next,
    quote: {
      total: r.total,
      deposit: r.depositAmount,
      items: r.items.map((i) => ({ label: i.label, amount: i.amount })),
    },
  };
}
