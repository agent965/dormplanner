"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type RelationState =
  | "self"
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "friends";

export function ProfileStatsBar({
  username,
  targetUserId,
  initialFriendsCount,
  eventsAttendedCount,
  isMe,
  isSignedIn,
  initialRelation,
}: {
  username: string;
  targetUserId: string | null;
  initialFriendsCount: number;
  eventsAttendedCount: number;
  isMe: boolean;
  isSignedIn: boolean;
  initialRelation: RelationState;
}) {
  const router = useRouter();
  const [relation, setRelation] = useState<RelationState>(initialRelation);
  const [friendsCount, setFriendsCount] = useState(initialFriendsCount);
  const [busy, setBusy] = useState(false);

  async function handleFriendButtonClick() {
    if (!isSignedIn) {
      router.push(`/signin?from=/users/${encodeURIComponent(username)}`);
      return;
    }
    if (!targetUserId || busy) return;

    setBusy(true);
    try {
      if (relation === "friends") {
        const res = await fetch("/api/friends", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "unfriend",
            targetUserId,
          }),
        });
        if (res.ok) {
          setRelation("none");
          setFriendsCount((c) => Math.max(0, c - 1));
          router.refresh();
        }
      } else if (relation === "pending_outgoing") {
        // Clicking again cancels the pending outgoing request
        const res = await fetch("/api/friends", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "unfriend",
            targetUserId,
          }),
        });
        if (res.ok) {
          setRelation("none");
          router.refresh();
        }
      } else {
        const res = await fetch("/api/friends", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "request",
            targetUserId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.state === "friends") {
            setRelation("friends");
            setFriendsCount((c) => c + 1);
          } else {
            setRelation("pending_outgoing");
          }
          router.refresh();
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Bar beneath the profile card */}
      <div className="card grid grid-cols-2 divide-x divide-[color:var(--border)] overflow-hidden">
        <Link
          href={`/users/${encodeURIComponent(username)}/friends`}
          className="flex flex-col items-center justify-center py-3 px-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <span className="text-lg font-semibold leading-tight">
            {friendsCount}
          </span>
          <span className="text-xs text-[color:var(--muted)] font-medium">
            Friends
          </span>
        </Link>
        <div className="flex flex-col items-center justify-center py-3 px-4">
          <span className="text-lg font-semibold leading-tight">
            {eventsAttendedCount}
          </span>
          <span className="text-xs text-[color:var(--muted)] font-medium">
            Events attended
          </span>
        </div>
      </div>

      {/* Add friend / Unfriend button centered below the bar on another user's profile */}
      {!isMe && targetUserId ? (
        <div className="flex justify-center">
          {relation === "friends" ? (
            <button
              type="button"
              onClick={handleFriendButtonClick}
              disabled={busy}
              className="px-6 py-2 rounded-full bg-white text-[color:var(--husky-purple)] border-2 border-[color:var(--husky-purple)] text-sm font-semibold hover:bg-[color:var(--husky-purple)]/5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Unfriend
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFriendButtonClick}
              disabled={busy}
              className="px-6 py-2 rounded-full bg-[color:var(--husky-purple)] text-white border-2 border-[color:var(--husky-purple)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {relation === "pending_outgoing"
                ? "Request sent"
                : "add friend"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

