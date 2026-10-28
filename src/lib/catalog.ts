// Danh mục dịch vụ mẫu. Giá lấy từ prototype v2 và là GIÁ TẠM (handoff §5), chưa phải bảng giá chốt.
import type { ServiceVersion } from "./pricing";

export const CATALOG: ServiceVersion[] = [
  {
    code: "logo",
    name: "Logo tối giản",
    basePrice: 990_000,
    rushSurcharge: 300_000,
    includedRevisions: 3,
    options: [{ code: "mini", label: "Bộ nhận diện mini (danh thiếp, ly)", price: 300_000 }],
  },
];

export function findService(code: string): ServiceVersion | undefined {
  return CATALOG.find((s) => s.code === code);
}
