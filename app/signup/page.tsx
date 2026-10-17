import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignUp({
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
        <h1 className="text-2xl font-semibold">Create a host account</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Pick a username to be shown as the host of your events.
        </p>
      </div>
      <SignupForm from={from ?? "/"} />
      <p className="text-xs text-[color:var(--muted)]">
        Already have one?{" "}
        <Link href={`/signin${from ? `?from=${encodeURIComponent(from)}` : ""}`} className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
