import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function newId(): string {
  // Short, URL-safe, time-sortable-ish. Hackathon-grade.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

export function formatEventTime(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(d: Date): string {
  const diffMs = d.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const mins = Math.round(absMs / 60000);
  if (mins < 60) return diffMs >= 0 ? `in ${mins}m` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return diffMs >= 0 ? `in ${hrs}h` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return diffMs >= 0 ? `in ${days}d` : `${days}d ago`;
}

export const DIETARY_TAGS = [
  { v: "vegetarian", label: "veg" },
  { v: "vegan", label: "vegan" },
  { v: "gluten_free", label: "GF" },
  { v: "dairy_free", label: "DF" },
  { v: "nut_free", label: "nut-free" },
  { v: "halal", label: "halal" },
  { v: "kosher", label: "kosher" },
  { v: "contains_pork", label: "⚠ pork" },
  { v: "contains_alcohol", label: "⚠ alcohol" },
] as const;

export const DIETARY_TAG_VALUES = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "halal",
  "kosher",
  "contains_pork",
  "contains_alcohol",
] as const;

export type DietaryTagValue = (typeof DIETARY_TAGS)[number]["v"];

export function dietaryTagLabel(v: string): string {
  return DIETARY_TAGS.find((d) => d.v === v)?.label ?? v;
}

export function getInProgressRemaining(
  startsAt: Date,
  endsAt?: Date | null,
  nowMs: number = Date.now()
): string | null {
  const startMs = startsAt.getTime();
  const endMs = endsAt ? endsAt.getTime() : startMs + 2 * 60 * 60 * 1000;
  if (nowMs < startMs || nowMs >= endMs) return null;

  const diffMs = endMs - nowMs;
  const totalMins = Math.max(1, Math.ceil(diffMs / 60000));
  if (totalMins < 60) return `${totalMins}m`;
  if (totalMins < 24 * 60) {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  const days = Math.floor(totalMins / (24 * 60));
  const hrs = Math.floor((totalMins % (24 * 60)) / 60);
  return hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
}


