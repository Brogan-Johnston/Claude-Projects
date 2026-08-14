const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function weekdayShort(dow) {
  return WEEKDAYS[dow];
}

export function daysUntil(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  return diff / (1000 * 60 * 60 * 24);
}

export function urgencyBadge(daysLeft) {
  if (daysLeft < 0) return { cls: "urgent", text: "Overdue" };
  if (daysLeft < 1) return { cls: "urgent", text: "Due today" };
  if (daysLeft < 3) return { cls: "warn", text: `${Math.ceil(daysLeft)}d left` };
  return { cls: "ok", text: `${Math.ceil(daysLeft)}d left` };
}

export function relativeCountdown(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { value: "T+0", unit: "now" };
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  if (days >= 1) return { value: `${days}`, unit: days === 1 ? "day" : "days" };
  return { value: `${hours}`, unit: hours === 1 ? "hour" : "hours" };
}
