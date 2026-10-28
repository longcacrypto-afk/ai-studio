import { describe, it, expect } from "vitest";
import { nextReply, type IntakeState } from "../src/lib/intake";

function run(msgs: string[]) {
  let st: IntakeState = {};
  let last = nextReply("", st);
  for (const m of msgs) { last = nextReply(m, st); st = last.state; }
  return last;
}

describe("trợ lý tiếp nhận brief (luật cố định)", () => {
  it("hỏi dịch vụ khi chưa rõ", () => {
    expect(nextReply("xin chào").text).toMatch(/làm gì/);
  });

  it("đủ brief thì báo giá đúng từ engine (1.290.000đ, cọc 645.000đ)", () => {
    const r = run(["làm logo", "Mộc An", "tối giản", "48 giờ"]);
    expect(r.quote).toBeDefined();
    expect(r.quote!.total).toBe(1290000);
    expect(r.quote!.deposit).toBe(645000);
  });

  it("chuyển người thật khi khách yêu cầu", () => {
    expect(nextReply("cho tôi nói chuyện với người thật").handoff).toBe(true);
  });

  it("không bao giờ đưa giá khi chưa đủ brief", () => {
    const r = run(["làm logo", "Mộc An"]);
    expect(r.quote).toBeUndefined();
  });
});
