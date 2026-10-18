import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// ~150 KB cap on avatar data URL (resized client-side first)
const MAX_AVATAR_LEN = 200_000;

const patchSchema = z.object({
  dormSlug: z.string().nullable().optional(),
  floor: z.string().max(20).nullable().optional(),
  displayName: z.string().trim().max(40).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  major: z.string().trim().max(80).nullable().optional(),
  campus: z.string().trim().max(40).nullable().optional(),
  year: z.string().trim().max(20).nullable().optional(),
  pronouns: z.string().trim().max(30).nullable().optional(),
  avatar: z
    .string()
    .max(MAX_AVATAR_LEN, "Image too large, try a smaller photo")
    .nullable()
    .optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Only update fields that were explicitly provided (undefined means "leave alone")
  const update: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) update[k] = v === "" ? null : v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  await db.update(users).set(update).where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true });
}
