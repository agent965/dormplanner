import { cookies } from "next/headers";
import { newId } from "./utils";

export type GuestIdentity = {
  guestId: string;
  guestName: string | null;
};

const GUEST_ID_COOKIE = "dp_guest_id";
const GUEST_NAME_COOKIE = "dp_guest_name";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Read the current guest identity (or null if the cookie isn't set yet). */
export async function readGuest(): Promise<GuestIdentity | null> {
  const jar = await cookies();
  const id = jar.get(GUEST_ID_COOKIE)?.value;
  if (!id) return null;
  const name = jar.get(GUEST_NAME_COOKIE)?.value ?? null;
  return { guestId: id, guestName: name };
}

/** Read the guest identity, minting a cookie if one doesn't exist. */
export async function ensureGuest(): Promise<GuestIdentity> {
  const existing = await readGuest();
  if (existing) return existing;
  const jar = await cookies();
  const guestId = "g_" + newId();
  jar.set(GUEST_ID_COOKIE, guestId, {
    maxAge: ONE_YEAR,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return { guestId, guestName: null };
}

/** Persist a guest's chosen display name. */
export async function setGuestName(name: string): Promise<void> {
  const jar = await cookies();
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return;
  jar.set(GUEST_NAME_COOKIE, trimmed, {
    maxAge: ONE_YEAR,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}
