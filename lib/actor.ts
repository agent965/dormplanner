import { auth } from "@/lib/auth";
import { readGuest, ensureGuest } from "@/lib/guest";

/** The current acting identity: signed-in user OR guest (cookie-based). */
export type Actor =
  | { kind: "user"; userId: string; displayName: string }
  | { kind: "guest"; guestId: string; displayName: string | null };

/** Read current actor without creating a guest cookie. */
export async function readActor(): Promise<Actor | null> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      kind: "user",
      userId: session.user.id,
      displayName: session.user.name ?? session.user.email ?? "someone",
    };
  }
  const guest = await readGuest();
  if (!guest) return null;
  return { kind: "guest", guestId: guest.guestId, displayName: guest.guestName };
}

/** Read actor; create a guest cookie if neither signed-in nor cookied yet. */
export async function ensureActor(): Promise<Actor> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      kind: "user",
      userId: session.user.id,
      displayName: session.user.name ?? session.user.email ?? "someone",
    };
  }
  const guest = await ensureGuest();
  return { kind: "guest", guestId: guest.guestId, displayName: guest.guestName };
}
