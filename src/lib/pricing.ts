// Pricing engine (spec BR-CAT-01): hàm thuần, không I/O.
// price(serviceVersion, options, qty, rush, plan) -> {items, subtotal, discount, total, depositAmount}

export type Money = number; // VND, số nguyên

export interface ServiceOption {
  code: string;
  label: string;
  price: Money;
}

export interface ServiceVersion {
  code: string;
  name: string;
  basePrice: Money;
  rushSurcharge: Money; // phụ phí giao gấp
  includedRevisions: number;
  options: ServiceOption[];
}

export interface PriceInput {
  service: ServiceVersion;
  optionCodes?: string[];
  qty?: number;
  rush?: boolean;
  planDiscountPct?: number; // 0–100
  depositPct?: number; // mặc định 50 (D2)
  smallOrderThreshold?: number; // đơn nhỏ hơn ngưỡng này thu 100% (D2)
}

export interface PriceItem {
  label: string;
  quantity: number;
  unitPrice: Money;
  amount: Money;
}

export interface PriceResult {
  items: PriceItem[];
  subtotal: Money;
  discount: Money;
  total: Money;
  depositPct: number;
  depositAmount: Money;
}

export const DEFAULT_DEPOSIT_PCT = 50;
export const DEFAULT_SMALL_ORDER = 500_000;

export function price(input: PriceInput): PriceResult {
  const { service } = input;
  const qty = input.qty ?? 1;
  if (!Number.isInteger(qty) || qty < 1) throw new Error("qty phải là số nguyên ≥ 1");

  const selected = (input.optionCodes ?? []).map((code) => {
    const opt = service.options.find((o) => o.code === code);
    if (!opt) throw new Error(`Tùy chọn không tồn tại: ${code}`);
    return opt;
  });

  const items: PriceItem[] = [
    { label: service.name, quantity: qty, unitPrice: service.basePrice, amount: service.basePrice * qty },
    ...selected.map((o) => ({ label: o.label, quantity: 1, unitPrice: o.price, amount: o.price })),
  ];
  if (input.rush) {
    items.push({ label: "Giao gấp", quantity: 1, unitPrice: service.rushSurcharge, amount: service.rushSurcharge });
  }

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const planPct = input.planDiscountPct ?? 0;
  if (planPct < 0 || planPct > 100) throw new Error("planDiscountPct ngoài khoảng 0–100");
  const discount = Math.round((subtotal * planPct) / 100);
  const total = subtotal - discount;

  const smallLimit = input.smallOrderThreshold ?? DEFAULT_SMALL_ORDER;
  const depositPct = total < smallLimit ? 100 : (input.depositPct ?? DEFAULT_DEPOSIT_PCT);
  const depositAmount = Math.round((total * depositPct) / 100);

  return { items, subtotal, discount, total, depositPct, depositAmount };
}
