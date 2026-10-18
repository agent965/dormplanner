import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SigninForm } from "./SigninForm";

export const dynamic = "force-dynamic";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { from, error } = await searchParams;

  return (
    <div className="max-w-sm mx-auto mt-16 text-center space-y-6">
      <div className="space-y-2">
        <div
          className="inline-block w-10 h-10 rounded-md"
          style={{ background: "var(--husky-purple)" }}
          aria-hidden
        />
        <h1 className="text-2xl font-semibold">Sign In</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Sign in to view and join dorm events, coordinate dishes, and connect with friends.
        </p>
      </div>

      <SigninForm from={from ?? "/"} initialError={error ?? null} />

      <p className="text-xs text-[color:var(--muted)]">
        No account?{" "}
        <Link href={`/signup${from ? `?from=${encodeURIComponent(from)}` : ""}`} className="underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
