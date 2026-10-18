"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

const CACHE_KEY = "dp_fp";
let promise: Promise<string> | null = null;

/**
 * Returns a stable browser fingerprint. Survives cookie clearing because it's
 * derived from browser characteristics (user agent, screen, timezone, GPU...).
 * Not bulletproof — a different browser or incognito mode will produce a
 * different hash — but it blocks the common "clear cookies and re-RSVP" bypass.
 */
export async function getFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";
  if (promise) return promise;
  promise = (async () => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) return cached;
    } catch {}
    const fp = await FingerprintJS.load();
    const r = await fp.get();
    try {
      sessionStorage.setItem(CACHE_KEY, r.visitorId);
    } catch {}
    return r.visitorId;
  })();
  return promise;
}
