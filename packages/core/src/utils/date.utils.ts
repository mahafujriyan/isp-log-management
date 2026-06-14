import { APP_CONFIG } from "@isp/core/config/app.config";

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function nowStr(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return `${pad(h)}:${pad(m)}:${pad(s)} ${h < 12 ? "AM" : "PM"}`;
}

export function toBtrcDatetime(date: Date = new Date()): string {
  return (
    date.toLocaleString("sv-SE", { timeZone: APP_CONFIG.timezone }).replace(" ", "T") +
    "+06:00"
  );
}

export function parseLogTime(timeStr: string): Date {
  const today = new Date();
  const match = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return today;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  const ampm = match[4]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  today.setHours(h, m, s, 0);
  return today;
}

export function formatLocaleDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(date).toLocaleString(APP_CONFIG.locale, {
    timeZone: APP_CONFIG.timezone,
    ...options,
  });
}
