import { describe, it, expect } from "vitest";
import { transition, nextState, canTransition, InvalidTransition, clientLabel, type JobState } from "../src/lib/job-machine";

describe("job state machine (spec §4.1)", () => {
  it("đi đường vui: queued → … → completed", () => {
    let s: JobState = "queued";
    s = transition(s, "dispatch"); expect(s).toBe("offered");
    s = transition(s, "accept"); expect(s).toBe("assigned");
    s = transition(s, "start"); expect(s).toBe("running");
    s = transition(s, "submit"); expect(s).toBe("submitted");
    s = transition(s, "qc_enqueue"); expect(s).toBe("qc_review");
    s = transition(s, "qc_pass"); expect(s).toBe("pending_approval");
    s = transition(s, "owner_approve"); expect(s).toBe("client_review");
    s = transition(s, "client_accept"); expect(s).toBe("accepted");
    s = transition(s, "final_packaged"); expect(s).toBe("completed");
  });

  it("QC fail quay lại running; fail tối đa → escalated", () => {
    expect(nextState("qc_review", "qc_fail")).toBe("running");
    expect(nextState("qc_review", "qc_fail_max")).toBe("escalated");
  });

  it("khách yêu cầu sửa → revision_requested → running", () => {
    expect(transition("client_review", "client_revision")).toBe("revision_requested");
    expect(transition("revision_requested", "start")).toBe("running");
  });

  it("owner reject đưa job về running để làm lại", () => {
    expect(transition("pending_approval", "owner_reject")).toBe("running");
  });

  it("stalled: retry → queued, quá ngưỡng → escalated", () => {
    expect(transition("stalled", "heartbeat_lost")).toBe("queued");
    expect(transition("stalled", "fail")).toBe("escalated");
  });

  it("hold chỉ áp dụng cho trạng thái có thể tạm dừng", () => {
    expect(transition("queued", "hold")).toBe("on_hold");
    expect(nextState("completed", "hold")).toBeNull();
  });

  it("cancel: được trước khi chạy và khi đang chạy, không được khi đã accepted", () => {
    expect(transition("queued", "cancel")).toBe("canceled");
    expect(transition("running", "cancel")).toBe("canceled");
    expect(nextState("accepted", "cancel")).toBeNull();
  });

  it("terminal không chuyển tiếp được", () => {
    expect(canTransition("completed", "start")).toBe(false);
    expect(canTransition("canceled", "dispatch")).toBe(false);
    expect(canTransition("failed", "fail")).toBe(false);
  });

  it("sự kiện sai trạng thái ném InvalidTransition", () => {
    expect(() => transition("queued", "client_accept")).toThrow(InvalidTransition);
  });

  it("nhãn khách thấy đúng mapping đơn giản hóa", () => {
    expect(clientLabel("qc_review")).toBe("Đang thực hiện");
    expect(clientLabel("client_review")).toBe("Chờ bạn duyệt bản nháp");
    expect(clientLabel("on_hold")).toBe("Tạm dừng");
  });
});
