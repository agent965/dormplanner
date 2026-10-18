"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { AvatarCropper } from "@/components/AvatarCropper";
import { UW_CAMPUSES, UW_YEARS } from "@/lib/profile";
import { UW_DORMS } from "@/lib/dorms";
import { fileToDataUrl } from "@/lib/image";

type Initial = {
  username: string;
  displayName: string | null;
  bio: string | null;
  major: string | null;
  campus: string | null;
  year: string | null;
  pronouns: string | null;
  avatar: string | null;
  dormSlug: string | null;
  floor: string | null;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [major, setMajor] = useState(initial.major ?? "");
  const [campus, setCampus] = useState(initial.campus ?? "");
  const [year, setYear] = useState(initial.year ?? "");
  const [pronouns, setPronouns] = useState(initial.pronouns ?? "");
  const [dormSlug, setDormSlug] = useState(initial.dormSlug ?? "");
  const [floor, setFloor] = useState(initial.floor ?? "");
  const [avatar, setAvatar] = useState<string | null>(initial.avatar);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setError(null);
    try {
      const url = await fileToDataUrl(file);
      setCropSrc(url); // open the cropper modal
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
    } finally {
      setAvatarBusy(false);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const r = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: displayName || null,
          bio: bio || null,
          major: major || null,
          campus: campus || null,
          year: year || null,
          pronouns: pronouns || null,
          dormSlug: dormSlug || null,
          floor: floor || null,
          avatar,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(typeof data?.error === "string" ? data.error : "Could not save.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const displayFallback = displayName || initial.username;

  return (
    <>
      {cropSrc ? (
        <AvatarCropper
          imageSrc={cropSrc}
          onCancel={() => setCropSrc(null)}
          onSave={(url) => {
            setAvatar(url);
            setCropSrc(null);
          }}
        />
      ) : null}
    <form onSubmit={submit} className="card p-5 space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar src={avatar} name={displayFallback} size={80} />
        <div className="flex flex-col gap-1.5">
          <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer px-3 py-1.5 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] hover:opacity-90 self-start">
            {avatarBusy ? "Working…" : avatar ? "Change photo" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
              disabled={avatarBusy}
            />
          </label>
          {avatar ? (
            <button
              type="button"
              onClick={() => setAvatar(null)}
              className="text-xs text-[color:var(--muted)] hover:text-[color:var(--danger)] self-start"
            >
              Remove photo
            </button>
          ) : (
            <span className="text-xs text-[color:var(--muted)]">
              Square JPG or PNG works best. We'll resize to 256px.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder={initial.username}
            className="w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
          />
          <Hint>Shown instead of @{initial.username} on cards and lists.</Hint>
        </Field>
        <Field label="Pronouns">
          <input
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            maxLength={30}
            placeholder="e.g. she/her, they/them"
            className="w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Bio">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="A short intro! What you love to cook, when you're free, any fun facts..."
          className="w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
        />
        <Hint>{bio.length}/500</Hint>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Campus">
          <select
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            className="w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm text-[color:var(--foreground)]"
          >
            <option value="">None</option>
            {UW_CAMPUSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm text-[color:var(--foreground)]"
          >
            <option value="">None</option>
            {UW_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Major">
          <input
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            maxLength={80}
            placeholder="e.g. CS, Biology"
            className="w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Dorm">
          <select
            value={dormSlug}
            onChange={(e) => setDormSlug(e.target.value)}
            className="w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm text-[color:var(--foreground)]"
          >
            <option value="">No dorm</option>
            {UW_DORMS.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Floor">
          <input
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            maxLength={20}
            placeholder="e.g. 3"
            className="w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
          />
        </Field>
      </div>

      {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
      {saved ? <p className="text-sm text-[color:var(--success)]">Saved!</p> : null}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[color:var(--border)]">
        <Link
          href={`/users/${encodeURIComponent(initial.username)}`}
          className="text-sm text-[color:var(--muted)] hover:underline"
        >
          View my profile
        </Link>
        <button
          type="submit"
          disabled={saving || avatarBusy}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[color:var(--muted)] font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-[color:var(--muted)]">{children}</p>;
}
