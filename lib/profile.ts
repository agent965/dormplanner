export const UW_CAMPUSES = ["UW Seattle", "UW Bothell", "UW Tacoma"] as const;

export const UW_YEARS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "5th year",
  "Grad",
  "Other",
] as const;

// Deterministic avatar background color from username — gives everyone a stable
// personal color even without an uploaded photo.
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export function initialFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
}
