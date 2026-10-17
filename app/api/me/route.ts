import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const patchSchema = z.object({
  dormSlug: z.string().nullable().optional(),
  floor: z.string().max(20).nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db
    .update(users)
    .set({
      dormSlug: parsed.data.dormSlug ?? null,
      floor: parsed.data.floor ?? null,
    })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
