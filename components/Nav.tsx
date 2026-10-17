import Link from "next/link";
import { signOut } from "@/lib/auth";

type NavUser = { name?: string | null; email?: string | null; image?: string | null } | null;

export function Nav({ user }: { user: NavUser }) {
  return (
    <header className="w-full border-b border-[color:var(--border)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            className="inline-block w-5 h-5 rounded-sm"
            style={{ background: "var(--husky-purple)" }}
            aria-hidden
          />
          <span>dormplanner</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/events/new" className="hover:underline">
            New event
          </Link>
          {user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button
                type="submit"
                className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                title={user.email ?? undefined}
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/signin" className="hover:underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
