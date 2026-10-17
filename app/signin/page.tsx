import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { from } = await searchParams;

  return (
    <div className="max-w-sm mx-auto mt-16 text-center space-y-6">
      <div className="space-y-2">
        <div
          className="inline-block w-10 h-10 rounded-md"
          style={{ background: "var(--husky-purple)" }}
          aria-hidden
        />
        <h1 className="text-2xl font-semibold">dormplanner</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Plan events with your dorm. Sign in with your UW Google account.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: from || "/" });
        }}
      >
        <button
          type="submit"
          className="w-full px-4 py-3 rounded-md bg-[color:var(--accent)] text-[color:var(--accent-fg)] font-medium"
        >
          Continue with UW Google
        </button>
      </form>
      <p className="text-xs text-[color:var(--muted)]">
        We only allow @uw.edu accounts.
      </p>
    </div>
  );
}
