"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import type { FriendEntry, IncomingRequestEntry } from "@/lib/friends";
import { formatEventTime } from "@/lib/utils";

type RequestItemState = {
  entry: IncomingRequestEntry;
  deleted: boolean;
};

function sortFriends(list: FriendEntry[]): FriendEntry[] {
  return [...list].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    if (b.sharedEventsCount !== a.sharedEventsCount) {
      return b.sharedEventsCount - a.sharedEventsCount;
    }
    return a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    });
  });
}

export function FriendsListClient({
  profileUsername,
  profileDisplayName,
  isMe,
  initialFriends,
  initialRequests,
}: {
  profileUsername: string;
  profileDisplayName: string;
  isMe: boolean;
  initialFriends: FriendEntry[];
  initialRequests: IncomingRequestEntry[];
}) {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendEntry[]>(() =>
    sortFriends(initialFriends)
  );
  const [requests, setRequests] = useState<RequestItemState[]>(() =>
    initialRequests.map((entry) => ({ entry, deleted: false }))
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Sync when server props update (while keeping any active "deleted" undo bars)
  useEffect(() => {
    setFriends(sortFriends(initialFriends));
  }, [initialFriends]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) {
        clearTimeout(t);
      }
    };
  }, []);

  // Close 3-dots menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    function onDocClick() {
      setOpenMenuId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openMenuId]);

  async function handleAcceptRequest(req: IncomingRequestEntry) {
    // Optimistically move from Incoming requests to Friends
    setRequests((prev) =>
      prev.filter((r) => r.entry.friendshipId !== req.friendshipId)
    );
    const newFriend: FriendEntry = {
      friendshipId: req.friendshipId,
      userId: req.userId,
      username: req.username,
      displayName: req.displayName,
      avatar: req.avatar,
      starred: false,
      sharedEventsCount: req.mostRecentSharedEvent ? 1 : 0,
    };
    setFriends((prev) => sortFriends([...prev, newFriend]));

    await fetch("/api/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "accept",
        friendshipId: req.friendshipId,
        targetUserId: req.userId,
      }),
    });
    router.refresh();
  }

  async function handleDenyRequest(req: IncomingRequestEntry) {
    // Replace request item with the centered Undo bar
    setRequests((prev) =>
      prev.map((item) =>
        item.entry.friendshipId === req.friendshipId
          ? { ...item, deleted: true }
          : item
      )
    );

    // Start 1-minute (60,000ms) timer to remove the bar permanently from view
    const existingTimer = timersRef.current.get(req.friendshipId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      setRequests((prev) =>
        prev.filter((item) => item.entry.friendshipId !== req.friendshipId)
      );
      timersRef.current.delete(req.friendshipId);
    }, 60_000);
    timersRef.current.set(req.friendshipId, timer);

    await fetch("/api/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "deny",
        friendshipId: req.friendshipId,
        targetUserId: req.userId,
      }),
    });
  }

  async function handleUndoDelete(req: IncomingRequestEntry) {
    const existingTimer = timersRef.current.get(req.friendshipId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(req.friendshipId);
    }

    // Restore back into Incoming requests in UI
    setRequests((prev) =>
      prev.map((item) =>
        item.entry.friendshipId === req.friendshipId
          ? { ...item, deleted: false }
          : item
      )
    );

    await fetch("/api/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "restore_request",
        friendshipId: req.friendshipId,
        targetUserId: req.userId,
      }),
    });
    router.refresh();
  }

  async function handleToggleStar(friend: FriendEntry) {
    setOpenMenuId(null);
    const nextStarred = !friend.starred;
    setFriends((prev) =>
      sortFriends(
        prev.map((f) =>
          f.friendshipId === friend.friendshipId
            ? { ...f, starred: nextStarred }
            : f
        )
      )
    );

    await fetch("/api/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "toggle_star",
        friendshipId: friend.friendshipId,
        targetUserId: friend.userId,
      }),
    });
    router.refresh();
  }

  async function handleRemoveFriend(friend: FriendEntry) {
    setOpenMenuId(null);
    setFriends((prev) =>
      prev.filter((f) => f.friendshipId !== friend.friendshipId)
    );

    await fetch("/api/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "remove",
        friendshipId: friend.friendshipId,
        targetUserId: friend.userId,
      }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top left back arrow + header */}
      <header className="flex items-center gap-3">
        <Link
          href={`/users/${encodeURIComponent(profileUsername)}`}
          aria-label={`Back to ${profileDisplayName}'s profile`}
          title={`Back to ${profileDisplayName}'s profile`}
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--husky-purple)] transition-colors shrink-0"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="display text-2xl font-semibold leading-tight">
            {isMe ? "Your Friends" : `${profileDisplayName}'s Friends`}
          </h1>
          <p className="text-xs text-[color:var(--muted)]">
            @{profileUsername}
          </p>
        </div>
      </header>

      {/* Incoming requests — only visible on your own friends list page */}
      {isMe ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
            Incoming requests
          </h2>
          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--border)] p-5 text-center text-sm text-[color:var(--muted)]">
              No incoming friend requests right now.
            </div>
          ) : (
            <ul className="space-y-2">
              {requests.map(({ entry: req, deleted }) => {
                if (deleted) {
                  return (
                    <li
                      key={req.friendshipId}
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 flex items-center justify-center gap-3 text-sm"
                    >
                      <span className="text-[color:var(--muted)]">
                        Deleted friend request from{" "}
                        <strong className="text-[color:var(--foreground)]">
                          {req.displayName}
                        </strong>{" "}
                        (@{req.username})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUndoDelete(req)}
                        className="px-3 py-1 rounded-md border border-[color:var(--husky-purple)] text-[color:var(--husky-purple)] text-xs font-semibold hover:bg-[color:var(--husky-purple)] hover:text-white transition-colors cursor-pointer"
                      >
                        Undo
                      </button>
                    </li>
                  );
                }

                return (
                  <li
                    key={req.friendshipId}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/users/${encodeURIComponent(req.username)}`}
                        className="shrink-0"
                      >
                        <Avatar
                          src={req.avatar}
                          name={req.displayName}
                          size={44}
                        />
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/users/${encodeURIComponent(req.username)}`}
                            className="font-semibold text-sm hover:underline"
                          >
                            {req.displayName}
                          </Link>
                          <span className="text-xs text-[color:var(--muted)]">
                            @{req.username}
                          </span>
                        </div>
                        <div className="text-xs text-[color:var(--muted)] mt-0.5">
                          {req.mostRecentSharedEvent ? (
                            <>
                              Most recent event together:{" "}
                              <span className="font-medium text-[color:var(--foreground)]">
                                {req.mostRecentSharedEvent.title}
                              </span>{" "}
                              (
                              {formatEventTime(
                                new Date(req.mostRecentSharedEvent.startsAt)
                              )}
                              )
                            </>
                          ) : (
                            "No past events attended together yet"
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req)}
                        aria-label={`Accept friend request from ${req.displayName}`}
                        title="Accept request"
                        className="w-8 h-8 rounded-full bg-[color:var(--husky-purple)] text-white flex items-center justify-center text-base font-bold hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDenyRequest(req)}
                        aria-label={`Deny friend request from ${req.displayName}`}
                        title="Deny request"
                        className="w-8 h-8 rounded-full border border-[color:var(--border)] hover:border-[color:var(--danger)] hover:text-[color:var(--danger)] flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {/* Friends list */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
          Friends
        </h2>
        {friends.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
            No friends in this list yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {friends.map((friend) => (
              <li
                key={friend.friendshipId}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    href={`/users/${encodeURIComponent(friend.username)}`}
                    className="shrink-0"
                  >
                    <Avatar
                      src={friend.avatar}
                      name={friend.displayName}
                      size={44}
                    />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/users/${encodeURIComponent(friend.username)}`}
                        className="font-semibold text-sm hover:underline"
                      >
                        {friend.displayName}
                      </Link>
                      {friend.starred ? (
                        <span
                          aria-label="Starred friend"
                          title="Starred friend"
                          className="text-[#eab308] text-base leading-none select-none"
                        >
                          ★
                        </span>
                      ) : null}
                      <span className="text-xs text-[color:var(--muted)]">
                        @{friend.username}
                      </span>
                    </div>
                    <div className="text-xs text-[color:var(--muted)] mt-0.5">
                      {friend.sharedEventsCount}{" "}
                      {friend.sharedEventsCount === 1 ? "event" : "events"}{" "}
                      attended together
                    </div>
                  </div>
                </div>

                {isMe ? (
                  <div
                    className="relative shrink-0"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId((prev) =>
                          prev === friend.friendshipId
                            ? null
                            : friend.friendshipId
                        )
                      }
                      aria-label="Friend options"
                      title="Options"
                      className="w-8 h-8 rounded-full border border-[color:var(--border)] hover:border-[color:var(--husky-purple)] flex items-center justify-center text-base font-bold leading-none cursor-pointer transition-colors"
                    >
                      ⋯
                    </button>

                    {openMenuId === friend.friendshipId ? (
                      <div className="absolute right-0 mt-1.5 w-40 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] shadow-lg py-1 z-20">
                        <button
                          type="button"
                          onClick={() => handleToggleStar(friend)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-[#eab308] text-sm leading-none">
                            ★
                          </span>
                          <span>
                            {friend.starred ? "Unstar friend" : "Star friend"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(friend)}
                          className="w-full text-left px-3 py-2 text-xs text-[color:var(--danger)] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                        >
                          <span>✕</span>
                          <span>Remove friend</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

