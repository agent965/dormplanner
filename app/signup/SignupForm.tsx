"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignupForm({ from }: { from: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setError(data?.error ?? "Could not create account.");
      setPending(false);
      return;
    }
    // Immediately sign in with the credentials we just created
    const s = await signIn("credentials", {
      username: username.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setPending(false);
    if (s?.error) {
      setError("Account created, but sign-in failed. Try the sign-in page.");
      return;
    }
    router.push(from);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <label className="block">
        <span className="text-xs text-[color:var(--muted)]">Username</span>
        <input
          autoFocus
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_.\-]+"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
        />
        <span className="block mt-1 text-[10px] text-[color:var(--muted)]">
          3–20 characters, letters/numbers/_.- only
        </span>
      </label>
      <label className="block">
        <span className="text-xs text-[color:var(--muted)]">Password</span>
        <input
          required
          type="password"
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
        />
        <span className="block mt-1 text-[10px] text-[color:var(--muted)]">
          At least 6 characters
        </span>
      </label>
      {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-3 rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)] font-medium disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
