import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 以中国时区返回 YYYY-MM-DD */
export function toDateKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

export function dateKeyToDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+08:00`);
}

export function addDays(dateKey: string, days: number): string {
  const date = dateKeyToDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

export function formatDate(dateKey: string, withWeekday = false): string {
  const date = dateKeyToDate(dateKey);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (!withWeekday) return `${month} 月 ${day} 日`;
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${month} 月 ${day} 日 ${weekdays[date.getUTCDay()]}`;
}

export function daysBetween(start: string, end: string): string[] {
  const result: string[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 400) {
    result.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return result;
}

export function average(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** 返回分钟数，跨午夜按 +24h 处理 */
export function timeToMinutes(value: string | null | undefined): number | null {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const [hour, minute] = normalized.split(":").map(Number);
  return hour * 60 + minute;
}

export function sleepMinutesBetween(start: string | null, end: string | null): number | null {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;
  let duration = endMinutes - startMinutes;
  if (duration <= 0) duration += 24 * 60;
  if (duration > 16 * 60) return null;
  return duration;
}

export function parseNumber(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

export function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
