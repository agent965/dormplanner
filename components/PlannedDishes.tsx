"use client";

import { useRef, useState } from "react";
import type { PlannedDish } from "@/lib/db/schema";
import type { RecipeSuggestion } from "@/app/api/recipes/search/route";
import { cn } from "@/lib/utils";

export function PlannedDishesList({
  dishes,
  onRemove,
  insideLink = false,
  muted = false,
}: {
  dishes?: PlannedDish[] | null;
  onRemove?: (index: number) => void;
  insideLink?: boolean;
  muted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!dishes || dishes.length === 0) return null;

  const hasMoreThanThree = dishes.length > 3;

  function renderDishBox(dish: PlannedDish, idx: number) {
    return (
      <div
        key={`${dish.name}-${idx}`}
        onClick={
          insideLink
            ? (ev) => {
                // Allow clicking remove or link inside card without triggering parent card navigation if needed
                ev.stopPropagation();
              }
            : undefined
        }
        className={cn(
          "relative w-[27%] min-w-[105px] max-w-[30%] shrink-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-2 flex flex-col gap-1.5 shadow-2xs",
          muted && "opacity-60"
        )}
      >
        {onRemove ? (
          <button
            type="button"
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              onRemove(idx);
            }}
            aria-label="Remove dish"
            title="Remove dish"
            className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80 cursor-pointer"
          >
            ×
          </button>
        ) : null}
        {dish.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="w-full h-16 sm:h-20 object-cover rounded-md border border-[color:var(--border)] bg-black/5"
          />
        ) : null}
        <div className="text-[11px] leading-snug font-medium break-words line-clamp-3">
          {dish.name}
        </div>
      </div>
    );
  }

  // Collapsed view (or <= 3 dishes): single row of up to 3 dishes + right arrow if > 3
  if (!hasMoreThanThree || !expanded) {
    const visibleDishes = hasMoreThanThree ? dishes.slice(0, 3) : dishes;
    return (
      <div className="mt-2 flex items-center gap-2">
        {visibleDishes.map((d, i) => renderDishBox(d, i))}
        {hasMoreThanThree ? (
          <button
            type="button"
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              setExpanded(true);
            }}
            aria-label="Expand planned dishes"
            title="Show all planned dishes"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--husky-purple)] text-[color:var(--foreground)] shrink-0 cursor-pointer transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        ) : null}
      </div>
    );
  }

  // Expanded view (> 3 dishes): rows of 3 dishes from left to right, with left arrow at the end
  const rows: PlannedDish[][] = [];
  for (let i = 0; i < dishes.length; i += 3) {
    rows.push(dishes.slice(i, i + 3));
  }

  return (
    <div className="mt-2 space-y-2">
      {rows.map((row, rowIdx) => {
        const isLastRow = rowIdx === rows.length - 1;
        return (
          <div key={rowIdx} className="flex items-center gap-2">
            {row.map((d, colIdx) => renderDishBox(d, rowIdx * 3 + colIdx))}
            {isLastRow ? (
              <button
                type="button"
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  setExpanded(false);
                }}
                aria-label="Collapse planned dishes"
                title="Collapse to 3 dishes"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--husky-purple)] text-[color:var(--foreground)] shrink-0 cursor-pointer transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      // Downscale large images on a canvas so JSON payloads stay small and fast
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function PlannedDishesEditor({
  dishes,
  onChange,
}: {
  dishes: PlannedDish[];
  onChange: (next: PlannedDish[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dishText, setDishText] = useState("");
  const [dishImageUrl, setDishImageUrl] = useState<string | null>(null);
  const [dishImageLabel, setDishImageLabel] = useState<string | null>(null);
  const [dishLink, setDishLink] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Search modal state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiRecipes, setAiRecipes] = useState<RecipeSuggestion[]>([]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setDishImageUrl(dataUrl);
      setDishImageLabel(file.name);
      setFieldError(null);
    } catch {
      setFieldError("Could not load the selected image.");
    }
  }

  function handleAddDish() {
    const trimmed = dishText.trim();
    if (!trimmed) {
      setFieldError("Please enter a recipe or dish name/description.");
      return;
    }
    setFieldError(null);
    onChange([
      ...dishes,
      {
        name: trimmed,
        imageUrl: dishImageUrl || null,
        link: dishLink || null,
      },
    ]);
    setDishText("");
    setDishImageUrl(null);
    setDishImageLabel(null);
    setDishLink(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleAiSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const q = aiQuery.trim();
    if (!q) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/recipes/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiError(data?.error || "Could not search recipes right now.");
        setAiLoading(false);
        return;
      }
      setAiMessage(data.assistantMessage ?? null);
      setAiRecipes(Array.isArray(data.recipes) ? data.recipes : []);
      setAiLoading(false);
    } catch {
      setAiError("Network error while searching recipes.");
      setAiLoading(false);
    }
  }

  function handleSelectAiRecipe(r: RecipeSuggestion) {
    setDishText(`${r.name}: ${r.description}`);
    setDishImageUrl(r.imageUrl);
    setDishImageLabel(`${r.name} (from AI search)`);
    setDishLink(r.link);
    setFieldError(null);
    setAiOpen(false);
  }

  return (
    <div className="space-y-2 rounded-lg border border-[color:var(--border)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[color:var(--muted)] uppercase tracking-wide">
          Plans
        </span>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? "Collapse plans form" : "Expand plans form"}
          title={expanded ? "Collapse" : "Add a plan"}
          className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-[color:var(--border)] hover:border-[color:var(--husky-purple)] text-sm font-bold leading-none cursor-pointer transition-colors"
        >
          +
        </button>
      </div>

      {expanded ? (
        <div className="pt-2 space-y-3 border-t border-[color:var(--border)]">
          <div>
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="px-4 py-1.5 rounded-full bg-[#007FFF] hover:bg-[#0066cc] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Search with AI
            </button>
          </div>

          <div>
            <textarea
              value={dishText}
              onChange={(e) => {
                setDishText(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              rows={3}
              placeholder="Activity Plans or Recipe Plans"
              className="w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#007FFF] underline hover:opacity-80 cursor-pointer"
              >
                upload an image
              </button>
              {dishImageUrl ? (
                <div className="flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dishImageUrl}
                    alt="Dish preview"
                    className="w-8 h-8 object-cover rounded border border-[color:var(--border)]"
                  />
                  {dishImageLabel ? (
                    <span className="text-[11px] text-[color:var(--muted)] max-w-[160px] truncate">
                      {dishImageLabel}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setDishImageUrl(null);
                      setDishImageLabel(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-[11px] text-[color:var(--danger)] hover:underline cursor-pointer"
                  >
                    remove
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleAddDish}
              className="px-4 py-1.5 rounded-md bg-[color:var(--husky-purple)] text-white text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              Submit
            </button>
          </div>

          {fieldError ? (
            <p className="text-xs text-[color:var(--danger)]">{fieldError}</p>
          ) : null}
        </div>
      ) : null}

      {/* AI Search Popup Modal */}
      {aiOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAiOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-xl space-y-4"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">
                  Ask Gemini for Recipe Ideas
                </h3>
                <p className="text-xs text-[color:var(--muted)]">
                  Ask about a dish, cuisine, or ingredients you have on hand.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAiOpen(false)}
                aria-label="Close AI Search"
                className="w-7 h-7 rounded-full border border-[color:var(--border)] flex items-center justify-center text-sm hover:border-[color:var(--husky-purple)] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAiSearch();
                  }
                }}
                placeholder="e.g. What can I make with chicken, garlic, and rice?"
                className="flex-1 bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => handleAiSearch()}
                disabled={aiLoading || !aiQuery.trim()}
                className="px-4 py-2 rounded-md bg-[#007FFF] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shrink-0"
              >
                {aiLoading ? "Searching…" : "Ask Gemini"}
              </button>
            </div>

            {aiError ? (
              <div className="text-xs text-[color:var(--danger)]">{aiError}</div>
            ) : null}

            {aiMessage ? (
              <div className="rounded-lg bg-black/5 dark:bg-white/5 p-3 text-xs leading-relaxed">
                <span className="font-semibold text-[#007FFF]">Gemini: </span>
                {aiMessage}
              </div>
            ) : null}

            {aiRecipes.length > 0 ? (
              <div className="space-y-2.5">
                <div className="text-xs font-medium text-[color:var(--muted)]">
                  Select a recipe to fill the dish details:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aiRecipes.map((r, idx) => (
                    <div
                      key={`${r.name}-${idx}`}
                      className="rounded-lg border border-[color:var(--border)] p-2.5 flex flex-col justify-between gap-2 bg-[color:var(--surface)]"
                    >
                      <div className="space-y-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.imageUrl}
                          alt={r.name}
                          className="w-full h-28 object-cover rounded-md border border-[color:var(--border)] bg-black/5"
                        />
                        <div className="text-sm font-semibold leading-snug">
                          {r.name}
                        </div>
                        <p className="text-xs text-[color:var(--muted)] line-clamp-2">
                          {r.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#007FFF] underline hover:opacity-80"
                        >
                          View recipe ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => handleSelectAiRecipe(r)}
                          className="px-2.5 py-1 rounded-md bg-[color:var(--husky-purple)] text-white text-xs font-medium hover:opacity-90 cursor-pointer"
                        >
                          Choose dish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

