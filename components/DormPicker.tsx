"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UW_DORMS } from "@/lib/dorms";

export function DormPicker({
  currentDormSlug,
  currentFloor,
}: {
  currentDormSlug: string | null;
  currentFloor: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function save(dormSlug: string, floor: string) {
    const r = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dormSlug: dormSlug || null,
        floor: floor || null,
      }),
    });
    if (r.ok) startTransition(() => router.refresh());
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        save(String(fd.get("dormSlug") ?? ""), String(fd.get("floor") ?? ""));
      }}
    >
      <label className="flex flex-col text-xs text-[color:var(--muted)]">
        Your dorm
        <select
          name="dormSlug"
          defaultValue={currentDormSlug ?? ""}
          className="mt-1 bg-transparent border border-[color:var(--border)] rounded-md px-2 py-1 text-sm text-[color:var(--foreground)]"
        >
          <option value="">— pick a dorm —</option>
          {UW_DORMS.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs text-[color:var(--muted)]">
        Floor
        <input
          name="floor"
          defaultValue={currentFloor ?? ""}
          placeholder="e.g. 3"
          className="mt-1 w-20 bg-transparent border border-[color:var(--border)] rounded-md px-2 py-1 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-1.5 text-sm rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)] disabled:opacity-50"
      >
        Save
      </button>
    </form>
  );
}
