"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SigninForm({
  from,
  initialError,
}: {
  from: string;
  initialError: string | null;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await signIn("credentials", {
      username: username.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setPending(false);
    if (r?.error) {
      setError("Wrong username or password.");
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
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs text-[color:var(--muted)]">Password</span>
        <input
          required
          type="password"
          minLength={6}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full bg-transparent border border-[color:var(--border)] rounded-md px-3 py-2 text-sm"
        />
      </label>
      {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-3 rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)] font-medium disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
