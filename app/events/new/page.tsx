import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NewEventForm } from "./NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [me] = await db
    .select({ dormSlug: users.dormSlug })
    .from(users)
    .where(eq(users.id, session.user.id));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New event</h1>
      <p className="text-sm text-[color:var(--muted)]">
        Create a cooking night, pizza party, study break — whatever. Others on
        your floor can RSVP and edit the bring-list.
      </p>
      <NewEventForm defaultDormSlug={me?.dormSlug ?? ""} />
    </div>
  );
}
