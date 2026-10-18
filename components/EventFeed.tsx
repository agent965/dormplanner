"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { EventCard, type EventCardProps } from "./EventCard";
import { UW_DORMS, dormName } from "@/lib/dorms";
import { cn, type DietaryTagValue } from "@/lib/utils";

const STORAGE_KEY = "dormplanner_tracked_events";

const DIETARY_FILTER_OPTIONS: Array<{ value: DietaryTagValue; label: string }> = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten-Free" },
  { value: "dairy_free", label: "Dairy-Free" },
  { value: "nut_free", label: "Nut-Free" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "contains_pork", label: "Contains Pork" },
  { value: "contains_alcohol", label: "Contains Alcohol" },
];

const LOOKING_FOR_FILTER_OPTIONS = [
  { key: "dishwasher", label: "Wash Dishes" },
  { key: "cook", label: "Cook" },
  { key: "ingredients", label: "Buy/Bring Ingredients" },
  { key: "cookware", label: "Bring Cookware/Utensils" },
] as const;

function compareEvents(a: EventCardProps, b: EventCardProps): number {
  const aCanceled = a.canceled ? 1 : 0;
  const bCanceled = b.canceled ? 1 : 0;
  if (aCanceled !== bCanceled) return aCanceled - bCanceled;

  const aStart = new Date(a.startsAt).getTime();
  const bStart = new Date(b.startsAt).getTime();
  if (aStart !== bStart) return aStart - bStart;

  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function matchesSearch(event: EventCardProps, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (event.title.toLowerCase().includes(q)) return true;
  if (event.description?.toLowerCase().includes(q)) return true;
  if (event.location?.toLowerCase().includes(q)) return true;
  if (event.hostName?.toLowerCase().includes(q)) return true;

  if (event.plannedDishes?.some((d) => d.name.toLowerCase().includes(q))) {
    return true;
  }

  if (
    event.goingList?.some(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.username && p.username.toLowerCase().includes(q))
    )
  ) {
    return true;
  }

  if (
    event.maybeList?.some(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.username && p.username.toLowerCase().includes(q))
    )
  ) {
    return true;
  }

  return false;
}

function matchesDorm(
  event: EventCardProps,
  selectedDorm: string,
  includeOpenToAll: boolean
): boolean {
  if (!selectedDorm || selectedDorm === "all") return true;
  if (event.dormSlug === selectedDorm) return true;
  if (includeOpenToAll && event.openToAllDorms) return true;
  return false;
}

function matchesFloor(event: EventCardProps, floorInput: string): boolean {
  const f = floorInput.trim().toLowerCase();
  if (!f) return true;

  const digits = f.replace(/\D/g, "");

  // Match host floor
  if (event.hostFloor) {
    const hf = event.hostFloor.trim().toLowerCase();
    if (hf === f) return true;
    if (digits && hf.replace(/\D/g, "") === digits) return true;
  }

  // Match event location (e.g. "4F lounge", "Floor 3", "302", etc.)
  if (event.location) {
    const loc = event.location.toLowerCase();
    if (loc.includes(f)) return true;
    if (digits) {
      const floorRegex = new RegExp(
        `\\b(floor\\s*|fl\\.?\\s*|flr\\s*)?0*${digits}(f|th|rd|st|nd)?\\b`,
        "i"
      );
      if (floorRegex.test(loc)) return true;
    }
  }

  return false;
}

function matchesDietary(
  event: EventCardProps,
  selectedTags: DietaryTagValue[]
): boolean {
  if (selectedTags.length === 0) return true;
  const eventTags = event.tags ?? [];
  return selectedTags.every((t) => eventTags.includes(t));
}

function matchesLookingFor(
  event: EventCardProps,
  selectedLookingFor: string[]
): boolean {
  if (selectedLookingFor.length === 0) return true;
  return selectedLookingFor.some((key) => {
    if (key === "dishwasher") return Boolean(event.lookingForDishwasher);
    if (key === "cook") return Boolean(event.lookingForCook);
    if (key === "ingredients") return Boolean(event.lookingForIngredients);
    if (key === "cookware") return Boolean(event.lookingForCookware);
    return false;
  });
}

export function EventFeed({
  events,
  canCreate = false,
  userDormSlug = null,
  userFloor = null,
}: {
  events: EventCardProps[];
  canCreate?: boolean;
  userDormSlug?: string | null;
  userFloor?: string | null;
}) {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dormFilter, setDormFilter] = useState<string>(userDormSlug ?? "all");
  const [floorFilter, setFloorFilter] = useState<string>(userFloor ?? "");
  const [includeOpenToAll, setIncludeOpenToAll] = useState(true);
  const [selectedDietary, setSelectedDietary] = useState<DietaryTagValue[]>([]);
  const [selectedLookingFor, setSelectedLookingFor] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPinnedIds(parsed.filter((x): x is string => typeof x === "string"));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  function toggleDietaryTag(val: DietaryTagValue) {
    setSelectedDietary((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  }

  function toggleLookingForTag(key: string) {
    setSelectedLookingFor((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  const hasActiveFilters = useMemo(() => {
    const defaultDorm = userDormSlug ?? "all";
    const defaultFloor = userFloor ?? "";
    return (
      searchQuery.trim() !== "" ||
      dormFilter !== defaultDorm ||
      floorFilter.trim() !== defaultFloor ||
      !includeOpenToAll ||
      selectedDietary.length > 0 ||
      selectedLookingFor.length > 0
    );
  }, [
    searchQuery,
    dormFilter,
    floorFilter,
    includeOpenToAll,
    selectedDietary,
    selectedLookingFor,
    userDormSlug,
    userFloor,
  ]);

  function handleResetFilters() {
    setSearchQuery("");
    setDormFilter("all");
    setFloorFilter("");
    setIncludeOpenToAll(true);
    setSelectedDietary([]);
    setSelectedLookingFor([]);
  }

  function handleResetToMyDorm() {
    setSearchQuery("");
    setDormFilter(userDormSlug ?? "all");
    setFloorFilter(userFloor ?? "");
    setIncludeOpenToAll(true);
    setSelectedDietary([]);
    setSelectedLookingFor([]);
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (!matchesSearch(e, searchQuery)) return false;
      if (!matchesDorm(e, dormFilter, includeOpenToAll)) return false;
      if (!matchesFloor(e, floorFilter)) return false;
      if (!matchesDietary(e, selectedDietary)) return false;
      if (!matchesLookingFor(e, selectedLookingFor)) return false;
      return true;
    });
  }, [
    events,
    searchQuery,
    dormFilter,
    includeOpenToAll,
    floorFilter,
    selectedDietary,
    selectedLookingFor,
  ]);

  const pinnedSet = new Set(pinnedIds);
  const sorted = [...filteredEvents].sort(compareEvents);
  const trackingEvents = sorted.filter((e) => pinnedSet.has(e.id));
  const upcomingEvents = sorted.filter((e) => !pinnedSet.has(e.id));
  const totalCount = trackingEvents.length + upcomingEvents.length;

  // Build the text that represents the events being filtered
  const filterRepresentation = useMemo(() => {
    const parts: string[] = [];

    if (dormFilter !== "all") {
      let dormDesc = dormName(dormFilter);
      if (floorFilter.trim()) {
        dormDesc += ` · floor ${floorFilter.trim()}`;
      }
      if (includeOpenToAll) {
        dormDesc += " plus open to all dorms";
      }
      parts.push(dormDesc);
    } else {
      if (floorFilter.trim()) {
        parts.push(`floor ${floorFilter.trim()} across all dorms`);
      } else {
        parts.push("all dorms");
      }
    }

    if (selectedDietary.length > 0) {
      const tagLabels = selectedDietary.map(
        (t) => DIETARY_FILTER_OPTIONS.find((o) => o.value === t)?.label ?? t
      );
      parts.push(tagLabels.join(", "));
    }

    if (selectedLookingFor.length > 0) {
      const roleLabels = selectedLookingFor.map(
        (k) => LOOKING_FOR_FILTER_OPTIONS.find((o) => o.key === k)?.label ?? k
      );
      parts.push(`looking for: ${roleLabels.join(", ")}`);
    }

    if (searchQuery.trim()) {
      parts.push(`matching "${searchQuery.trim()}"`);
    }

    return parts.join(" · ");
  }, [
    dormFilter,
    floorFilter,
    includeOpenToAll,
    selectedDietary,
    selectedLookingFor,
    searchQuery,
  ]);

  return (
    <div className="space-y-6">
      {/* Overhauled Filtering System Card */}
      <section className="card p-5 space-y-4">
        {/* Introduction to the filtering system with Collapse Toggle */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 flex-wrap">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[color:var(--husky-purple)] shrink-0"
                aria-hidden
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter &amp; Search Events
              {hasActiveFilters ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[color:var(--husky-purple)] text-white">
                  Active
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-xs text-[color:var(--muted)] max-w-xl">
              Welcome to the event filtering system! Find meals and gatherings happening around campus — filter by dorm building &amp; floor, dietary restrictions, roles needed, or search by keyword and username.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {userDormSlug && dormFilter !== userDormSlug ? (
              <button
                type="button"
                onClick={handleResetToMyDorm}
                className="text-xs px-2.5 py-1 rounded-full border border-[color:var(--border)] hover:border-[color:var(--husky-purple)] text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
              >
                My dorm ({dormName(userDormSlug)})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-expanded={!isCollapsed}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-[color:var(--border)] hover:border-[color:var(--husky-purple)] hover:text-[color:var(--husky-purple)] transition-colors cursor-pointer"
            >
              <span>{isCollapsed ? "Expand filters" : "Collapse"}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "transition-transform duration-200",
                  !isCollapsed && "rotate-180"
                )}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        {!isCollapsed ? (
          <div className="space-y-4 pt-1">
            {/* 1. Keyword search and user search in a search bar */}
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] pointer-events-none"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by keyword, meal, location, or host/attendee username…"
            className="w-full bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-[color:var(--husky-purple)] transition-colors placeholder:text-[color:var(--muted)]/70"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)] p-1 rounded"
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* 2. Dorm building & optionally floor number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="block text-xs font-medium text-[color:var(--muted)]">
            Dorm Building
            <select
              value={dormFilter}
              onChange={(e) => setDormFilter(e.target.value)}
              className="mt-1 w-full bg-[color:var(--surface)] border border-[color:var(--border)] rounded-md px-3 py-1.5 text-sm text-[color:var(--foreground)] focus:outline-none focus:border-[color:var(--husky-purple)]"
            >
              <option value="all">All Dorms (Campus-wide)</option>
              {userDormSlug ? (
                <option value={userDormSlug}>
                  {dormName(userDormSlug)} (My dorm)
                </option>
              ) : null}
              <optgroup label="UW Seattle Halls &amp; Apartments">
                {UW_DORMS.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label className="block text-xs font-medium text-[color:var(--muted)]">
            Floor Number (optional)
            <div className="relative mt-1">
              <input
                type="text"
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                placeholder="e.g. 3, 4F, or lounge"
                maxLength={20}
                className="w-full bg-[color:var(--surface)] border border-[color:var(--border)] rounded-md px-3 py-1.5 text-sm text-[color:var(--foreground)] focus:outline-none focus:border-[color:var(--husky-purple)]"
              />
              {floorFilter ? (
                <button
                  type="button"
                  onClick={() => setFloorFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                  title="Clear floor"
                  aria-label="Clear floor"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </label>
        </div>

        {dormFilter !== "all" ? (
          <label className="flex items-center gap-2 text-xs text-[color:var(--muted)] -mt-1">
            <input
              type="checkbox"
              checked={includeOpenToAll}
              onChange={(e) => setIncludeOpenToAll(e.target.checked)}
              className="rounded"
            />
            Include events open to all dorms
          </label>
        ) : null}

        {/* 3. Certain dietary restrictions */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[color:var(--muted)]">
              Dietary Restrictions
            </span>
            {selectedDietary.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedDietary([])}
                className="text-[11px] text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                Clear dietary
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DIETARY_FILTER_OPTIONS.map((tag) => {
              const active = selectedDietary.includes(tag.value);
              return (
                <button
                  type="button"
                  key={tag.value}
                  onClick={() => toggleDietaryTag(tag.value)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
                    active
                      ? "bg-[color:var(--husky-purple)] text-white border-transparent shadow-xs"
                      : "border-[color:var(--border)] text-[color:var(--muted)] hover:border-[color:var(--husky-purple)] hover:text-[color:var(--foreground)]"
                  )}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. “Looking for” tags */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[color:var(--muted)]">
              Looking for Help With
            </span>
            {selectedLookingFor.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedLookingFor([])}
                className="text-[11px] text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                Clear roles
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LOOKING_FOR_FILTER_OPTIONS.map((role) => {
              const active = selectedLookingFor.includes(role.key);
              return (
                <button
                  type="button"
                  key={role.key}
                  onClick={() => toggleLookingForTag(role.key)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
                    active
                      ? "bg-[color:var(--husky-purple)] text-white border-transparent shadow-xs"
                      : "border-[color:var(--border)] text-[color:var(--muted)] hover:border-[color:var(--husky-purple)] hover:text-[color:var(--foreground)]"
                  )}
                >
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    ) : null}

        {/* Bit of text representing the events being filtered, placed below the bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-[color:var(--border)] text-xs sm:text-sm">
          <p className="text-[color:var(--muted)]">
            Showing{" "}
            <strong className="text-[color:var(--foreground)]">
              {totalCount}
            </strong>{" "}
            {totalCount === 1 ? "event" : "events"} in{" "}
            <strong className="text-[color:var(--foreground)]">
              {filterRepresentation}
            </strong>
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold px-3 py-1 rounded-full border border-[color:var(--border)] hover:border-[color:var(--husky-purple)] hover:text-[color:var(--husky-purple)] transition-colors whitespace-nowrap"
            >
              Reset filters
            </button>
          ) : null}
        </div>
      </section>

      {/* Tracking Section */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          Tracking ({trackingEvents.length})
        </h2>
        {trackingEvents.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
            {pinnedIds.length === 0
              ? "No tracked events yet. Click the pin icon on an event to track it here."
              : "No tracked events match your current filter settings."}
          </div>
        ) : (
          <ul className="space-y-2">
            {trackingEvents.map((e) => (
              <li key={e.id}>
                <EventCard
                  {...e}
                  pinned={true}
                  onTogglePin={togglePin}
                  nowMs={nowMs}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming Section */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          Upcoming ({upcomingEvents.length})
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[color:var(--muted)] space-y-2">
            {events.length === 0 ? (
              <p>
                Nothing on the calendar yet.
                {canCreate ? (
                  <>
                    {" "}
                    <Link
                      href="/events/new"
                      className="text-[color:var(--husky-purple)] underline"
                    >
                      Start the first event.
                    </Link>
                  </>
                ) : null}
              </p>
            ) : totalCount === 0 ? (
              <div className="py-2">
                <p className="font-medium text-[color:var(--foreground)]">
                  No events match your current filters.
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Try clearing some dietary restrictions, looking-for tags, or expanding your dorm building selection.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 inline-flex items-center text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[color:var(--crust)] text-white uppercase tracking-wide shadow-xs hover:opacity-90"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <p>All upcoming events are currently in your Tracking list.</p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {upcomingEvents.map((e) => (
              <li key={e.id}>
                <EventCard
                  {...e}
                  pinned={false}
                  onTogglePin={togglePin}
                  nowMs={nowMs}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
