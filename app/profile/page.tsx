import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?from=/profile");

  const [me] = await db
    .select({
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      major: users.major,
      campus: users.campus,
      year: users.year,
      pronouns: users.pronouns,
      avatar: users.avatar,
      dormSlug: users.dormSlug,
      floor: users.floor,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!me) redirect("/signin");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="display text-2xl font-semibold">Your profile</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Add a photo and some details so other huskies get to know you better! Your @{me.username} stays locked in.
        </p>
      </header>
      <ProfileForm initial={me} />
    </div>
  );
}
