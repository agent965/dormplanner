"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type LookingForState = {
  lookingForDishwasher: boolean;
  lookingForCook: boolean;
  lookingForIngredients: boolean;
  lookingForCookware: boolean;
};

type AnimPhase = "static-off" | "turning-on" | "static-on" | "turning-off";

function useToggleAnimPhase(active: boolean, durationMs: number): AnimPhase {
  const prevRef = useRef<boolean>(active);
  const [phase, setPhase] = useState<AnimPhase>(
    active ? "static-on" : "static-off"
  );

  useEffect(() => {
    if (prevRef.current === active) return;
    prevRef.current = active;
    const nextAnim: AnimPhase = active ? "turning-on" : "turning-off";
    setPhase(nextAnim);
    const timer = setTimeout(() => {
      setPhase(active ? "static-on" : "static-off");
    }, durationMs);
    return () => clearTimeout(timer);
  }, [active, durationMs]);

  return phase;
}

export const LOOKING_FOR_BUTTONS: Array<{
  key: keyof LookingForState;
  label: string;
}> = [
  { key: "lookingForDishwasher", label: "Looking for dishwasher" },
  { key: "lookingForCook", label: "Looking for Cook" },
  { key: "lookingForIngredients", label: "Looking for Ingredients" },
  { key: "lookingForCookware", label: "Looking for Cookware/Utensils" },
];

export function LookingForImages({ state }: { state: LookingForState }) {
  const cookPhase = useToggleAnimPhase(state.lookingForCook, 700);
  const ingredientsPhase = useToggleAnimPhase(state.lookingForIngredients, 750);
  const cookwarePhase = useToggleAnimPhase(state.lookingForCookware, 1150);

  return (
    <div className="w-full">
      <style>{`
        /* 2. Cook: Pasta plate smoke poof */
        @keyframes smokePoof {
          0% {
            transform: scale(0.25);
            opacity: 0;
          }
          35% {
            transform: scale(1.08);
            opacity: 0.96;
          }
          70% {
            transform: scale(1.22);
            opacity: 0.75;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        @keyframes pastaVanish {
          0%, 25% {
            transform: scale(1);
            opacity: 1;
          }
          55%, 100% {
            transform: scale(0.6);
            opacity: 0;
          }
        }
        @keyframes pastaAppear {
          0%, 25% {
            transform: scale(0.6);
            opacity: 0;
          }
          60%, 100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .cook-smoke-active {
          transform-origin: 60px 58px;
          animation: smokePoof 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .cook-pasta-vanish {
          transform-origin: 60px 60px;
          animation: pastaVanish 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .cook-pasta-appear {
          transform-origin: 60px 60px;
          animation: pastaAppear 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* 3. Ingredients: Groceries fall through bottom / drop from top */
        @keyframes groceriesFallThrough {
          0% {
            transform: translateY(0px);
            opacity: 1;
          }
          75% {
            transform: translateY(58px);
            opacity: 1;
          }
          100% {
            transform: translateY(72px);
            opacity: 0;
          }
        }
        @keyframes groceriesDropFromTop {
          0% {
            transform: translateY(-68px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          82% {
            transform: translateY(4px);
            opacity: 1;
          }
          100% {
            transform: translateY(0px);
            opacity: 1;
          }
        }
        .groceries-fall-out {
          animation: groceriesFallThrough 750ms cubic-bezier(0.4, 0, 0.75, 0.9) forwards;
        }
        .groceries-drop-in {
          animation: groceriesDropFromTop 750ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* 4. Cookware/Utensils: Cauldron + diamond sparkles + hanging water (0.5s) + splash & extinguish */
        @keyframes cauldronDisappear {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          18%, 100% {
            transform: scale(0.85);
            opacity: 0;
          }
        }
        @keyframes cauldronSlideDown {
          0% {
            transform: translateY(-58px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          85% {
            transform: translateY(2px);
            opacity: 1;
          }
          100% {
            transform: translateY(0px);
            opacity: 1;
          }
        }
        @keyframes diamondSparkles {
          0% {
            transform: scale(0.2);
            opacity: 0;
          }
          15% {
            transform: scale(1.15);
            opacity: 1;
          }
          38% {
            transform: scale(0.9);
            opacity: 0.85;
          }
          55%, 100% {
            transform: scale(0);
            opacity: 0;
          }
        }
        /* Water hangs in cauldron shape for 500ms (~15% to ~60% of 1150ms), then falls onto fire */
        @keyframes waterHangAndFall {
          0%, 10% {
            transform: translateY(0px) scale(1, 1);
            opacity: 1;
          }
          /* Hang in cauldron interior shape for half a second (120ms -> 620ms) */
          54% {
            transform: translateY(0px) scale(1, 1);
            opacity: 1;
          }
          /* Fall onto the campfire */
          82% {
            transform: translateY(34px) scale(1.25, 0.55);
            opacity: 0.95;
          }
          100% {
            transform: translateY(40px) scale(1.6, 0.15);
            opacity: 0;
          }
        }
        @keyframes fireExtinguish {
          0%, 58% {
            transform: scale(1);
            opacity: 1;
          }
          82% {
            transform: scale(1.1, 0.35);
            opacity: 0.6;
          }
          100% {
            transform: scale(0.2, 0);
            opacity: 0;
          }
        }
        @keyframes fireReignite {
          0%, 15% {
            transform: scale(0.2, 0);
            opacity: 0;
          }
          65% {
            transform: scale(1.08, 1.1);
            opacity: 1;
          }
          100% {
            transform: scale(1, 1);
            opacity: 1;
          }
        }
        .cauldron-vanish {
          transform-origin: 60px 40px;
          animation: cauldronDisappear 1150ms ease forwards;
        }
        .cauldron-slide-in {
          animation: cauldronSlideDown 800ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sparkles-pop {
          transform-origin: 60px 38px;
          animation: diamondSparkles 1150ms ease forwards;
        }
        .water-hang-fall {
          transform-origin: 60px 42px;
          animation: waterHangAndFall 1150ms cubic-bezier(0.32, 0, 0.67, 0) forwards;
        }
        .fire-go-out {
          transform-origin: 60px 88px;
          animation: fireExtinguish 1150ms ease forwards;
        }
        .fire-reignite {
          transform-origin: 60px 88px;
          animation: fireReignite 800ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full items-center">
        {/* 1. Dishwasher: Clean pan <-> Dirty pan with brown spots */}
        <div className="w-full aspect-square bg-[color:var(--surface)] flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 120 110"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label={
              state.lookingForDishwasher ? "Dirty pan" : "Clean pan"
            }
          >
            {/* Pan handle */}
            <path
              d="M78 42 L110 22"
              stroke="#475569"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M80 41 L108 23"
              stroke="#94a3b8"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="106" cy="24.5" r="1.8" fill="#1e293b" />

            {/* Outer pan rim */}
            <ellipse
              cx="50"
              cy="60"
              rx="38"
              ry="30"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="2.5"
            />
            {/* Inner cooking surface */}
            <ellipse
              cx="50"
              cy="60"
              rx="32"
              ry="24"
              style={{
                fill: state.lookingForDishwasher ? "#cbd5e1" : "#e2e8f0",
                transition: "fill 550ms ease",
              }}
            />
            {/* Clean shine arc (fades out when dirty) */}
            <path
              d="M27 52 C32 43, 46 40, 58 43"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                opacity: state.lookingForDishwasher ? 0 : 0.85,
                transition: "opacity 450ms ease",
              }}
            />

            {/* Brown dirty spots (smoothly animate in when toggled on, and reverse out when untoggled) */}
            <g>
              <ellipse
                cx="38"
                cy="55"
                rx="8.5"
                ry="6"
                fill="#78350f"
                style={{
                  transformOrigin: "38px 55px",
                  transform: state.lookingForDishwasher
                    ? "scale(1)"
                    : "scale(0)",
                  opacity: state.lookingForDishwasher ? 0.85 : 0,
                  transition:
                    "transform 520ms cubic-bezier(0.22, 1, 0.36, 1) 0ms, opacity 450ms ease 0ms",
                }}
              />
              <ellipse
                cx="59"
                cy="64"
                rx="9.5"
                ry="6.5"
                fill="#92400e"
                style={{
                  transformOrigin: "59px 64px",
                  transform: state.lookingForDishwasher
                    ? "scale(1)"
                    : "scale(0)",
                  opacity: state.lookingForDishwasher ? 0.88 : 0,
                  transition:
                    "transform 520ms cubic-bezier(0.22, 1, 0.36, 1) 60ms, opacity 450ms ease 60ms",
                }}
              />
              <circle
                cx="52"
                cy="49"
                r="5"
                fill="#854d0e"
                style={{
                  transformOrigin: "52px 49px",
                  transform: state.lookingForDishwasher
                    ? "scale(1)"
                    : "scale(0)",
                  opacity: state.lookingForDishwasher ? 0.8 : 0,
                  transition:
                    "transform 520ms cubic-bezier(0.22, 1, 0.36, 1) 110ms, opacity 450ms ease 110ms",
                }}
              />
              <ellipse
                cx="42"
                cy="69"
                rx="6.5"
                ry="4.5"
                fill="#713f12"
                style={{
                  transformOrigin: "42px 69px",
                  transform: state.lookingForDishwasher
                    ? "scale(1)"
                    : "scale(0)",
                  opacity: state.lookingForDishwasher ? 0.82 : 0,
                  transition:
                    "transform 520ms cubic-bezier(0.22, 1, 0.36, 1) 150ms, opacity 450ms ease 150ms",
                }}
              />
              <circle
                cx="66"
                cy="53"
                r="3.8"
                fill="#78350f"
                style={{
                  transformOrigin: "66px 53px",
                  transform: state.lookingForDishwasher
                    ? "scale(1)"
                    : "scale(0)",
                  opacity: state.lookingForDishwasher ? 0.78 : 0,
                  transition:
                    "transform 520ms cubic-bezier(0.22, 1, 0.36, 1) 190ms, opacity 450ms ease 190ms",
                }}
              />
              <circle
                cx="29"
                cy="62"
                r="3.2"
                fill="#92400e"
                style={{
                  transformOrigin: "29px 62px",
                  transform: state.lookingForDishwasher
                    ? "scale(1)"
                    : "scale(0)",
                  opacity: state.lookingForDishwasher ? 0.75 : 0,
                  transition:
                    "transform 520ms cubic-bezier(0.22, 1, 0.36, 1) 220ms, opacity 450ms ease 220ms",
                }}
              />
            </g>
          </svg>
        </div>

        {/* 2. Cook: Plate of pasta with red sauce and meatballs <-> Poof of smoke */}
        <div className="w-full aspect-square bg-[color:var(--surface)] flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 120 110"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label={
              state.lookingForCook
                ? "Empty plate (looking for cook)"
                : "Plate of pasta with red sauce and meatballs"
            }
          >
            {/* Ceramic Plate (always visible) */}
            <ellipse
              cx="60"
              cy="68"
              rx="46"
              ry="26"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="2.5"
            />
            <ellipse
              cx="60"
              cy="68"
              rx="34"
              ry="18"
              fill="#f1f5f9"
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />

            {/* Pasta, red sauce, and meatballs */}
            <g
              className={
                cookPhase === "turning-on"
                  ? "cook-pasta-vanish"
                  : cookPhase === "turning-off"
                  ? "cook-pasta-appear"
                  : ""
              }
              style={{
                opacity:
                  cookPhase === "static-on"
                    ? 0
                    : cookPhase === "static-off"
                    ? 1
                    : undefined,
              }}
            >
              {/* Spaghetti noodles mound */}
              <ellipse cx="60" cy="63" rx="28" ry="15" fill="#fde047" />
              <path
                d="M36 64 Q48 50 62 62 T84 61"
                stroke="#facc15"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M38 68 Q54 55 68 67 T82 65"
                stroke="#eab308"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M42 57 Q58 46 75 58"
                stroke="#fef08a"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Red marinara sauce */}
              <path
                d="M40 58 C42 49, 55 46, 63 48 C72 46, 80 52, 79 59 C81 65, 71 70, 61 68 C50 70, 39 65, 40 58 Z"
                fill="#dc2626"
              />
              <ellipse cx="58" cy="57" rx="14" ry="7" fill="#ef4444" />

              {/* Meatballs */}
              <circle
                cx="50"
                cy="55"
                r="6.5"
                fill="#7c2d12"
                stroke="#431407"
                strokeWidth="1"
              />
              <circle cx="48" cy="53" r="1.8" fill="#9a3412" />
              <circle
                cx="67"
                cy="54"
                r="6.5"
                fill="#7c2d12"
                stroke="#431407"
                strokeWidth="1"
              />
              <circle cx="65" cy="52" r="1.8" fill="#9a3412" />
              <circle
                cx="59"
                cy="63"
                r="6.5"
                fill="#7c2d12"
                stroke="#431407"
                strokeWidth="1"
              />
              <circle cx="57" cy="61" r="1.8" fill="#9a3412" />

              {/* Garnish basil leaf */}
              <path
                d="M58 49 C61 44, 66 45, 64 50 C61 52, 58 51, 58 49 Z"
                fill="#16a34a"
              />
            </g>

            {/* Poof of smoke (plays on both toggle and untoggle) */}
            {cookPhase === "turning-on" || cookPhase === "turning-off" ? (
              <g key={cookPhase} className="cook-smoke-active">
                <circle cx="44" cy="58" r="15" fill="#e2e8f0" />
                <circle cx="76" cy="58" r="15" fill="#e2e8f0" />
                <circle cx="60" cy="46" r="18" fill="#f1f5f9" />
                <circle cx="50" cy="66" r="14" fill="#cbd5e1" />
                <circle cx="70" cy="66" r="14" fill="#cbd5e1" />
                <circle cx="60" cy="57" r="16" fill="#ffffff" />
              </g>
            ) : null}
          </svg>
        </div>

        {/* 3. Ingredients: Paper grocery bag with groceries sticking out */}
        <div className="w-full aspect-square bg-[color:var(--surface)] flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 120 110"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label={
              state.lookingForIngredients
                ? "Empty paper grocery bag"
                : "Full paper grocery bag"
            }
          >
            <defs>
              {/* Clip path so groceries fall through the bottom of the bag and disappear */}
              <clipPath id="groceryBagClip">
                <rect x="20" y="0" width="80" height="96" />
              </clipPath>
            </defs>

            {/* Back lip of the paper bag */}
            <path
              d="M33 38 L87 38 L85 44 L35 44 Z"
              fill="#92400e"
            />

            {/* Groceries inside the bag (clipped to bag bottom) */}
            <g clipPath="url(#groceryBagClip)">
              <g
                className={
                  ingredientsPhase === "turning-on"
                    ? "groceries-fall-out"
                    : ingredientsPhase === "turning-off"
                    ? "groceries-drop-in"
                    : ""
                }
                style={{
                  opacity:
                    ingredientsPhase === "static-on"
                      ? 0
                      : ingredientsPhase === "static-off"
                      ? 1
                      : undefined,
                }}
              >
                {/* Baguette on left */}
                <rect
                  x="37"
                  y="14"
                  width="12"
                  height="34"
                  rx="6"
                  transform="rotate(-10 37 14)"
                  fill="#eab308"
                  stroke="#ca8a04"
                  strokeWidth="1.5"
                />
                <line
                  x1="39"
                  y1="21"
                  x2="45"
                  y2="19"
                  stroke="#fef08a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="40"
                  y1="27"
                  x2="46"
                  y2="25"
                  stroke="#fef08a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                {/* Leafy greens in center */}
                <circle cx="58" cy="24" r="9" fill="#22c55e" />
                <circle cx="65" cy="21" r="8" fill="#16a34a" />
                <circle cx="52" cy="28" r="7" fill="#15803d" />

                {/* Carrot sticking out right */}
                <path
                  d="M72 15 L81 18 L73 43 L68 41 Z"
                  fill="#f97316"
                />
                <path
                  d="M76 16 L79 9 M77 16 L83 11"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Red tomato / apple */}
                <circle cx="64" cy="34" r="7.5" fill="#ef4444" />
                <path
                  d="M64 26 L65 24"
                  stroke="#15803d"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Milk / carton corner */}
                <rect
                  x="45"
                  y="27"
                  width="13"
                  height="18"
                  rx="1.5"
                  fill="#38bdf8"
                />
              </g>
            </g>

            {/* Front body of the brown paper grocery bag */}
            <path
              d="M33 38 L37 35 L41 38 L45 35 L49 38 L53 35 L57 38 L61 35 L65 38 L69 35 L73 38 L77 35 L81 38 L84 35 L87 38 L83 95 L37 95 Z"
              fill="#d97706"
              stroke="#b45309"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Paper bag side fold crease & shading */}
            <path
              d="M76 38 L87 38 L83 95 L74 95 Z"
              fill="#b45309"
              opacity="0.35"
            />
            <line
              x1="43"
              y1="44"
              x2="44"
              y2="90"
              stroke="#b45309"
              strokeWidth="1.2"
              opacity="0.45"
            />
          </svg>
        </div>

        {/* 4. Cookware/Utensils: Campfire with cauldron above it (side view) */}
        <div className="w-full aspect-square bg-[color:var(--surface)] flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 120 110"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label={
              state.lookingForCookware
                ? "Extinguished campfire without cauldron"
                : "Campfire with cauldron above it"
            }
          >
            {/* Campfire wooden logs at base (side view, always present) */}
            <g>
              <rect
                x="32"
                y="88"
                width="56"
                height="9"
                rx="4.5"
                transform="rotate(-8 60 92)"
                fill="#78350f"
                stroke="#451a03"
                strokeWidth="1.5"
              />
              <rect
                x="32"
                y="88"
                width="56"
                height="9"
                rx="4.5"
                transform="rotate(8 60 92)"
                fill="#92400e"
                stroke="#451a03"
                strokeWidth="1.5"
              />
            </g>

            {/* Campfire flames */}
            <g
              className={
                cookwarePhase === "turning-on"
                  ? "fire-go-out"
                  : cookwarePhase === "turning-off"
                  ? "fire-reignite"
                  : ""
              }
              style={{
                opacity:
                  cookwarePhase === "static-on"
                    ? 0
                    : cookwarePhase === "static-off"
                    ? 1
                    : undefined,
              }}
            >
              {/* Outer orange/red flame */}
              <path
                d="M42 88 C39 74, 49 64, 53 56 C56 64, 60 60, 62 53 C67 61, 72 67, 70 74 C75 69, 79 76, 78 88 Z"
                fill="#f97316"
              />
              {/* Middle amber flame */}
              <path
                d="M47 88 C45 77, 53 69, 57 62 C60 68, 64 65, 66 60 C70 68, 74 77, 73 88 Z"
                fill="#fb923c"
              />
              {/* Inner bright yellow core */}
              <path
                d="M52 88 C51 80, 56 73, 60 68 C64 73, 69 80, 68 88 Z"
                fill="#fde047"
              />
            </g>

            {/* Water in the shape of the inside of the cauldron (visible when cauldron disappears, hangs 0.5s, then falls onto fire) */}
            {cookwarePhase === "turning-on" ? (
              <g key="water-fall" className="water-hang-fall">
                <path
                  d="M39 28 H81 C82 44, 73 53, 60 53 C47 53, 38 44, 39 28 Z"
                  fill="#38bdf8"
                />
                <ellipse cx="60" cy="28" rx="21" ry="3.5" fill="#7dd3fc" />
              </g>
            ) : null}

            {/* Diamond-shaped sparkles when cauldron disappears */}
            {cookwarePhase === "turning-on" ? (
              <g key="sparkles" className="sparkles-pop">
                <path
                  d="M34 20 L37 26 L34 32 L31 26 Z"
                  fill="#38bdf8"
                />
                <path
                  d="M86 22 L89 28 L86 34 L83 28 Z"
                  fill="#facc15"
                />
                <path
                  d="M60 11 L63.5 18 L60 25 L56.5 18 Z"
                  fill="#a855f7"
                />
                <path
                  d="M44 48 L46.5 53 L44 58 L41.5 53 Z"
                  fill="#facc15"
                />
                <path
                  d="M77 47 L79.5 52 L77 57 L74.5 52 Z"
                  fill="#38bdf8"
                />
              </g>
            ) : null}

            {/* Cauldron above the campfire (side view) */}
            <g
              className={
                cookwarePhase === "turning-on"
                  ? "cauldron-vanish"
                  : cookwarePhase === "turning-off"
                  ? "cauldron-slide-in"
                  : ""
              }
              style={{
                opacity:
                  cookwarePhase === "static-on"
                    ? 0
                    : cookwarePhase === "static-off"
                    ? 1
                    : undefined,
              }}
            >
              {/* Side handles */}
              <circle
                cx="35"
                cy="34"
                r="4.5"
                stroke="#1e293b"
                strokeWidth="2.5"
                fill="none"
              />
              <circle
                cx="85"
                cy="34"
                r="4.5"
                stroke="#1e293b"
                strokeWidth="2.5"
                fill="none"
              />
              {/* Cauldron body */}
              <path
                d="M37 25 H83 C85 44, 75 55, 60 55 C45 55, 35 44, 37 25 Z"
                fill="#334155"
                stroke="#1e293b"
                strokeWidth="2"
              />
              {/* Water peeking at top rim */}
              <ellipse cx="60" cy="25" rx="22" ry="4" fill="#38bdf8" />
              {/* Cauldron top lip */}
              <rect
                x="35"
                y="22"
                width="50"
                height="5"
                rx="2.5"
                fill="#475569"
                stroke="#1e293b"
                strokeWidth="1.5"
              />
              {/* Subtle highlight on cauldron belly */}
              <path
                d="M43 32 C43 41, 48 47, 55 49"
                stroke="#64748b"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

export function LookingForEditor({
  state,
  onChange,
  readOnly = false,
}: {
  state: LookingForState;
  onChange?: (next: LookingForState) => void;
  readOnly?: boolean;
}) {
  function toggle(key: keyof LookingForState) {
    if (readOnly || !onChange) return;
    onChange({
      ...state,
      [key]: !state[key],
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs text-[color:var(--muted)]">
          Looking for someone to:{" "}
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {LOOKING_FOR_BUTTONS.map((btn) => {
            const active = state[btn.key];
            return (
              <button
                key={btn.key}
                type="button"
                disabled={readOnly}
                onClick={() => toggle(btn.key)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  active
                    ? "bg-[color:var(--husky-purple)] text-white border-transparent"
                    : "border-[color:var(--border)] text-[color:var(--muted)]",
                  !readOnly &&
                    !active &&
                    "hover:border-[color:var(--husky-purple)]",
                  readOnly && "cursor-not-allowed opacity-85"
                )}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      <LookingForImages state={state} />
    </div>
  );
}

type RoleInfo = LookingForState & {
  dishwasherClaimedById: string | null;
  dishwasherClaimedByGuestId: string | null;
  dishwasherClaimedByName: string | null;
  cookClaimedById: string | null;
  cookClaimedByGuestId: string | null;
  cookClaimedByName: string | null;
};

export function EventRolesAndLookingFor({
  eventId,
  initial,
  actorKind,
  userId,
  guestId,
  initialGuestName,
  isHost,
}: {
  eventId: string;
  initial: RoleInfo;
  actorKind: "user" | "guest";
  userId: string | null;
  guestId: string | null;
  initialGuestName: string | null;
  isHost: boolean;
}) {
  const [data, setData] = useState<RoleInfo>(initial);
  const [busyRole, setBusyRole] = useState<"cook" | "dishwasher" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const needsName = actorKind === "guest" && !initialGuestName;

  const isMyClaim = (
    claimedById: string | null,
    claimedByGuestId: string | null
  ) => {
    if (actorKind === "user") {
      return Boolean(userId && claimedById === userId);
    }
    return Boolean(guestId && claimedByGuestId === guestId);
  };

  async function refresh() {
    try {
      const r = await fetch(`/api/events/${eventId}/roles`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const next: RoleInfo = await r.json();
      if (mounted.current) {
        setData(next);
      }
    } catch {
      // ignore network errors during background poll
    }
  }

  useEffect(() => {
    mounted.current = true;
    const interval = setInterval(refresh, 2500);
    const onSync = () => {
      refresh();
    };
    window.addEventListener("dormplanner:looking-for-sync", onSync);
    return () => {
      mounted.current = false;
      clearInterval(interval);
      window.removeEventListener("dormplanner:looking-for-sync", onSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleRoleAction(
    role: "cook" | "dishwasher",
    action: "claim" | "unclaim"
  ) {
    if (needsName) {
      setError("Set your name above first.");
      return;
    }
    setBusyRole(role);
    setError(null);
    try {
      const r = await fetch(`/api/events/${eventId}/roles`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, action }),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        if (errData?.error === "name_required") {
          setError("Set your name above first.");
        } else {
          setError("Could not update role.");
        }
        return;
      }
      await refresh();
    } finally {
      setBusyRole(null);
    }
  }

  const cookClaimed = Boolean(data.cookClaimedById || data.cookClaimedByGuestId);
  const myCookClaim = isMyClaim(data.cookClaimedById, data.cookClaimedByGuestId);
  const showCookSignup = Boolean(data.lookingForCook || cookClaimed);

  const dishClaimed = Boolean(
    data.dishwasherClaimedById || data.dishwasherClaimedByGuestId
  );
  const myDishClaim = isMyClaim(
    data.dishwasherClaimedById,
    data.dishwasherClaimedByGuestId
  );
  const showDishwasherSignup = Boolean(data.lookingForDishwasher || dishClaimed);

  const showSignUpBox = showCookSignup || showDishwasherSignup;

  return (
    <>
      {/* Box below "Are you going?" allowing users to sign up to cook or do dishes (only shown if Cook or Wash Dishes was enabled) */}
      {showSignUpBox ? (
        <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Sign up to help</h2>
            <span className="text-xs text-[color:var(--muted)]">
              Live
            </span>
          </div>

          <ul className="space-y-2">
            {/* Cook signup row */}
            {showCookSignup ? (
              <li
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3",
                  cookClaimed && "opacity-85"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "font-medium",
                        cookClaimed &&
                          "line-through decoration-[color:var(--husky-purple)]/50"
                      )}
                    >
                      Cook
                    </span>
                    {data.lookingForCook ? (
                      <span className="tag text-[11px]">Cook</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    {cookClaimed ? (
                      myCookClaim ? (
                        "You signed up to cook"
                      ) : (
                        <>
                          {data.cookClaimedById && data.cookClaimedByName ? (
                            <Link
                              href={`/users/${encodeURIComponent(
                                data.cookClaimedByName
                              )}`}
                              className="underline hover:text-[color:var(--husky-purple)]"
                            >
                              {data.cookClaimedByName}
                            </Link>
                          ) : (
                            data.cookClaimedByName
                          )}{" "}
                          is cooking
                        </>
                      )
                    ) : (
                      "Sign up to cook for this event"
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {cookClaimed ? (
                    myCookClaim || isHost ? (
                      <button
                        type="button"
                        disabled={busyRole === "cook"}
                        onClick={() => handleRoleAction("cook", "unclaim")}
                        className="group inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:-translate-y-px active:translate-y-px active:shadow-[0_0_0_rgba(0,0,0,0.25)] transition-all whitespace-nowrap"
                      >
                        Unclaim
                      </button>
                    ) : null
                  ) : (
                    <button
                      type="button"
                      disabled={busyRole === "cook"}
                      onClick={() => handleRoleAction("cook", "claim")}
                      className="group inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:-translate-y-px active:translate-y-px active:shadow-[0_0_0_rgba(0,0,0,0.25)] transition-all whitespace-nowrap"
                    >
                      I&apos;ll cook
                    </button>
                  )}
                </div>
              </li>
            ) : null}

            {/* Dishwasher signup row */}
            {showDishwasherSignup ? (
              <li
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3",
                  dishClaimed && "opacity-85"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "font-medium",
                        dishClaimed &&
                          "line-through decoration-[color:var(--husky-purple)]/50"
                      )}
                    >
                      Dishwasher
                    </span>
                    {data.lookingForDishwasher ? (
                      <span className="tag text-[11px]">
                        Wash Dishes
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    {dishClaimed ? (
                      myDishClaim ? (
                        "You signed up to do dishes"
                      ) : (
                        <>
                          {data.dishwasherClaimedById &&
                          data.dishwasherClaimedByName ? (
                            <Link
                              href={`/users/${encodeURIComponent(
                                data.dishwasherClaimedByName
                              )}`}
                              className="underline hover:text-[color:var(--husky-purple)]"
                            >
                              {data.dishwasherClaimedByName}
                            </Link>
                          ) : (
                            data.dishwasherClaimedByName
                          )}{" "}
                          is doing dishes
                        </>
                      )
                    ) : (
                      "Sign up to do dishes for this event"
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {dishClaimed ? (
                    myDishClaim || isHost ? (
                      <button
                        type="button"
                        disabled={busyRole === "dishwasher"}
                        onClick={() => handleRoleAction("dishwasher", "unclaim")}
                        className="group inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:-translate-y-px active:translate-y-px active:shadow-[0_0_0_rgba(0,0,0,0.25)] transition-all whitespace-nowrap"
                      >
                        Unclaim
                      </button>
                    ) : null
                  ) : (
                    <button
                      type="button"
                      disabled={busyRole === "dishwasher"}
                      onClick={() => handleRoleAction("dishwasher", "claim")}
                      className="group inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:-translate-y-px active:translate-y-px active:shadow-[0_0_0_rgba(0,0,0,0.25)] transition-all whitespace-nowrap"
                    >
                      I&apos;ll do dishes
                    </button>
                  )}
                </div>
              </li>
            ) : null}
          </ul>

          {error ? (
            <p className="text-xs text-[color:var(--danger)]">{error}</p>
          ) : null}
        </section>
      ) : null}

      {/* Box below displaying the four images representative of the state of the tags */}
      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[color:var(--muted)] mr-1">
            Looking for someone to:
          </span>
          {LOOKING_FOR_BUTTONS.map((btn) => {
            const active = data[btn.key];
            return (
              <span
                key={btn.key}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  active
                    ? "bg-[color:var(--husky-purple)] text-white border-transparent"
                    : "border-[color:var(--border)] text-[color:var(--muted)]"
                )}
              >
                {btn.label}
              </span>
            );
          })}
        </div>

        <LookingForImages
          state={{
            lookingForDishwasher: data.lookingForDishwasher,
            lookingForCook: data.lookingForCook,
            lookingForIngredients: data.lookingForIngredients,
            lookingForCookware: data.lookingForCookware,
          }}
        />
      </section>
    </>
  );
}

