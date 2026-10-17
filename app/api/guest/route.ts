import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureGuest, setGuestName, readGuest } from "@/lib/guest";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export async function GET() {
  const g = await readGuest();
  return NextResponse.json(g ?? { guestId: null, guestName: null });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await ensureGuest();
  await setGuestName(parsed.data.name);
  return NextResponse.json({ ok: true, name: parsed.data.name });
}
