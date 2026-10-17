import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { newId } from "@/lib/utils";

const bodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be 20 characters or fewer")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, _ . - only"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const username = parsed.data.username.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const id = newId();
  await db.insert(users).values({
    id,
    username,
    passwordHash,
  });

  return NextResponse.json({ ok: true, id, username });
}
