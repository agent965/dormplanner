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
          {user ? (
            <>
              <Link href="/events/new" className="hover:underline">
                New event
              </Link>
              <span className="text-xs text-[color:var(--muted)]">
                {user.name ? `@${user.name}` : ""}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/signin"
              className="px-3 py-1.5 rounded-md border border-[color:var(--husky-purple)] text-[color:var(--husky-purple)] hover:bg-[color:var(--husky-purple)] hover:text-white transition-colors"
            >
              Sign in to host
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
