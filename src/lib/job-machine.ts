// Job state machine (spec §4.1). Chỉ chứa luật chuyển trạng thái; không I/O.

export const JOB_STATES = [
  "queued",
  "offered",
  "assigned",
  "running",
  "input_required",
  "submitted",
  "qc_review",
  "pending_approval",
  "client_review",
  "revision_requested",
  "accepted",
  "completed",
  "on_hold",
  "stalled",
  "escalated",
  "canceled",
  "failed",
] as const;

export type JobState = (typeof JOB_STATES)[number];

export type JobEvent =
  | "dispatch"
  | "accept"
  | "decline_or_timeout"
  | "start"
  | "progress"
  | "needs_input"
  | "input_answered"
  | "submit"
  | "qc_enqueue"
  | "qc_pass"
  | "qc_fail"
  | "qc_fail_max"
  | "owner_approve"
  | "owner_reject"
  | "client_revision"
  | "client_accept"
  | "auto_accept"
  | "final_packaged"
  | "heartbeat_lost"
  | "hold"
  | "resume"
  | "cancel"
  | "fail"
  | "owner_takeover_resolve";

type Transition = { from: JobState | JobState[]; event: JobEvent; to: JobState };

// Bảng chuyển trạng thái (chỉ các cạnh trong spec). "hold"/"cancel"/"fail" xử lý riêng bên dưới.
const TRANSITIONS: Transition[] = [
  { from: "queued", event: "dispatch", to: "offered" },
  { from: "offered", event: "accept", to: "assigned" },
  { from: "offered", event: "decline_or_timeout", to: "queued" },
  { from: "assigned", event: "start", to: "running" },
  { from: "running", event: "progress", to: "running" },
  { from: "running", event: "needs_input", to: "input_required" },
  { from: "input_required", event: "input_answered", to: "running" },
  { from: "running", event: "submit", to: "submitted" },
  { from: "submitted", event: "qc_enqueue", to: "qc_review" },
  { from: "qc_review", event: "qc_pass", to: "pending_approval" },
  { from: "qc_review", event: "qc_fail", to: "running" },
  { from: "qc_review", event: "qc_fail_max", to: "escalated" },
  { from: "pending_approval", event: "owner_approve", to: "client_review" },
  { from: "pending_approval", event: "owner_reject", to: "running" },
  { from: "client_review", event: "client_revision", to: "revision_requested" },
  { from: "revision_requested", event: "start", to: "running" },
  { from: "client_review", event: "client_accept", to: "accepted" },
  { from: "client_review", event: "auto_accept", to: "accepted" },
  { from: "accepted", event: "final_packaged", to: "completed" },
  { from: ["running", "assigned"], event: "heartbeat_lost", to: "stalled" },
  { from: "stalled", event: "heartbeat_lost", to: "queued" }, // retry
  { from: "stalled", event: "fail", to: "escalated" },
  { from: "escalated", event: "owner_takeover_resolve", to: "running" },
];

const TERMINAL: JobState[] = ["completed", "canceled", "failed"];

export const HOLDABLE: JobState[] = ["queued", "running", "assigned", "offered", "input_required"];
const CANCELABLE_PRE_RUN: JobState[] = ["queued", "offered", "assigned"];
const CANCELABLE_RUNNING: JobState[] = ["running", "input_required", "submitted", "qc_review", "pending_approval", "revision_requested", "stalled"];

export class InvalidTransition extends Error {
  constructor(public from: JobState, public event: JobEvent) {
    super(`Không thể chuyển từ ${from} bằng sự kiện ${event}`);
  }
}

export function canTransition(from: JobState, event: JobEvent): boolean {
  return nextState(from, event) !== null;
}

export function nextState(from: JobState, event: JobEvent): JobState | null {
  if (TERMINAL.includes(from)) return null;
  if (event === "hold") return HOLDABLE.includes(from) ? "on_hold" : null;
  if (event === "cancel") {
    if (CANCELABLE_PRE_RUN.includes(from) || CANCELABLE_RUNNING.includes(from)) return "canceled";
    return null;
  }
  if (event === "fail") return from === "stalled" ? "escalated" : "failed";
  for (const t of TRANSITIONS) {
    const froms = Array.isArray(t.from) ? t.from : [t.from];
    if (t.event === event && froms.includes(from)) return t.to;
  }
  return null;
}

export function transition(from: JobState, event: JobEvent): JobState {
  const to = nextState(from, event);
  if (!to) throw new InvalidTransition(from, event);
  return to;
}

// Mapping trạng thái khách thấy (spec §4.1)
export function clientLabel(state: JobState): string {
  switch (state) {
    case "queued":
    case "offered":
    case "assigned":
      return "Đang xếp hàng";
    case "running":
    case "submitted":
    case "qc_review":
    case "pending_approval":
    case "stalled":
    case "escalated":
    case "revision_requested":
      return "Đang thực hiện";
    case "input_required":
      return "Cần bạn bổ sung thông tin";
    case "on_hold":
      return "Tạm dừng";
    case "client_review":
      return "Chờ bạn duyệt bản nháp";
    case "accepted":
      return "Đã duyệt — đang đóng gói file";
    case "completed":
      return "Hoàn tất — tải file";
    case "canceled":
    case "failed":
      return "Đã hủy";
  }
}
