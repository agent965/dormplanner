"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EditProfileButton() {
  const router = useRouter();
  const [animating, setAnimating] = useState(false);

  function handleClick() {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      router.push("/profile");
    }, 750);
  }

  return (
    <>
      <style>{`
        @keyframes panFlipAnim {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          18% {
            transform: translate(0px, 2px) rotate(7deg);
          }
          45% {
            transform: translate(-1px, -4px) rotate(-28deg);
          }
          78% {
            transform: translate(0px, 0.5px) rotate(3deg);
          }
          100% {
            transform: translate(0px, 0px) rotate(0deg);
          }
        }
        @keyframes veggieTossLeft {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
            opacity: 1;
          }
          18% {
            transform: translate(0px, 2px) rotate(5deg);
            opacity: 1;
          }
          65% {
            transform: translate(-6px, -24px) rotate(-140deg);
            opacity: 1;
          }
          75%, 100% {
            transform: translate(-8px, -30px) rotate(-180deg);
            opacity: 0;
          }
        }
        @keyframes veggieTossCenter {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
            opacity: 1;
          }
          18% {
            transform: translate(0px, 2px) rotate(-4deg);
            opacity: 1;
          }
          65% {
            transform: translate(1px, -26px) rotate(120deg);
            opacity: 1;
          }
          75%, 100% {
            transform: translate(2px, -32px) rotate(160deg);
            opacity: 0;
          }
        }
        @keyframes veggieTossRight {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
            opacity: 1;
          }
          18% {
            transform: translate(0px, 2px) rotate(6deg);
            opacity: 1;
          }
          65% {
            transform: translate(7px, -23px) rotate(150deg);
            opacity: 1;
          }
          75%, 100% {
            transform: translate(9px, -29px) rotate(190deg);
            opacity: 0;
          }
        }
        .pan-flip-active {
          transform-origin: 22px 16px;
          animation: panFlipAnim 720ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .veggie-toss-l {
          transform-origin: 9px 13px;
          animation: veggieTossLeft 720ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .veggie-toss-c {
          transform-origin: 13px 12px;
          animation: veggieTossCenter 720ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .veggie-toss-r {
          transform-origin: 17px 13px;
          animation: veggieTossRight 720ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--husky-purple)] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
      >
        <span className="relative inline-flex items-center justify-center w-8 h-6 overflow-hidden rounded bg-black/[0.03] dark:bg-white/[0.04] border border-[color:var(--border)]/60 shrink-0">
          <svg
            width="32"
            height="24"
            viewBox="0 0 36 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Colorful veggies piled in the pan */}
            <g className={animating ? "veggie-toss-l" : ""}>
              {/* Red bell pepper / tomato */}
              <circle cx="8.5" cy="13.2" r="2.3" fill="#ef4444" />
              {/* Orange carrot slice */}
              <rect
                x="10"
                y="11.2"
                width="3.2"
                height="2.2"
                rx="1"
                transform="rotate(-12 10 11.2)"
                fill="#f97316"
              />
            </g>
            <g className={animating ? "veggie-toss-c" : ""}>
              {/* Green broccoli / herb */}
              <circle cx="13" cy="12" r="2.5" fill="#22c55e" />
              <circle cx="11.5" cy="13.5" r="1.8" fill="#16a34a" />
              {/* Yellow corn / bell pepper */}
              <rect
                x="13.8"
                y="12.2"
                width="2.8"
                height="2.4"
                rx="1"
                transform="rotate(10 13.8 12.2)"
                fill="#facc15"
              />
            </g>
            <g className={animating ? "veggie-toss-r" : ""}>
              {/* Purple onion / eggplant */}
              <circle cx="17.5" cy="13.2" r="2.1" fill="#a855f7" />
              {/* Red tomato bit */}
              <circle cx="15.8" cy="11.3" r="1.7" fill="#e85a4f" />
              {/* Green pea / herb */}
              <circle cx="19.2" cy="13.8" r="1.5" fill="#22c55e" />
            </g>

            {/* Horizontal frying pan */}
            <g className={animating ? "pan-flip-active" : ""}>
              {/* Handle */}
              <line
                x1="22"
                y1="15.3"
                x2="33.5"
                y2="14.5"
                stroke="#78350f"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              {/* Pan body */}
              <path
                d="M3.5 14.8 H23 L21.2 19.6 C20.8 20.6 19.8 21.2 18.7 21.2 H7.8 C6.7 21.2 5.7 20.6 5.3 19.6 L3.5 14.8 Z"
                fill="#334155"
                stroke="#1e293b"
                strokeWidth="1"
                strokeLinejoin="round"
              />
              {/* Pan rim highlight */}
              <line
                x1="3.5"
                y1="14.8"
                x2="23"
                y2="14.8"
                stroke="#64748b"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </span>
        <span>Edit Profile</span>
      </button>
    </>
  );
}

