import {
  PizzaSlice,
  Bowl,
  Cookie,
  Mug,
  Pot,
  Carrot,
  Cupcake,
  Bread,
  Sparkle,
  ChefHat,
} from "@/components/FoodArt";

// Fixed, scattered food doodles behind the whole page. Each one is anchored
// with percentages so it adapts to viewport size; low opacity so content stays
// readable; pointer-events-none so it never blocks clicks.
const SCATTER: Array<{
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  size: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotate: number;
  color: string;
  opacity: number;
}> = [
  { Icon: PizzaSlice, size: 72, top: "6%", left: "4%", rotate: -16, color: "var(--tomato)", opacity: 0.12 },
  { Icon: Mug, size: 56, top: "12%", right: "8%", rotate: 10, color: "var(--husky-purple)", opacity: 0.1 },
  { Icon: Carrot, size: 64, top: "28%", left: "-2%", rotate: 32, color: "var(--tomato)", opacity: 0.09 },
  { Icon: Cookie, size: 60, top: "32%", right: "4%", rotate: -22, color: "var(--crust)", opacity: 0.13 },
  { Icon: ChefHat, size: 68, top: "48%", left: "6%", rotate: -8, color: "var(--husky-purple)", opacity: 0.1 },
  { Icon: Pot, size: 76, top: "54%", right: "-2%", rotate: 6, color: "var(--herb)", opacity: 0.11 },
  { Icon: Bread, size: 64, top: "72%", left: "10%", rotate: 16, color: "var(--crust)", opacity: 0.11 },
  { Icon: Cupcake, size: 56, top: "76%", right: "12%", rotate: -14, color: "var(--tomato)", opacity: 0.1 },
  { Icon: Bowl, size: 72, bottom: "6%", left: "40%", rotate: 4, color: "var(--husky-purple)", opacity: 0.1 },
  { Icon: Sparkle, size: 20, top: "20%", left: "48%", rotate: 0, color: "var(--cheese)", opacity: 0.5 },
  { Icon: Sparkle, size: 14, top: "60%", left: "30%", rotate: 0, color: "var(--tomato)", opacity: 0.4 },
  { Icon: Sparkle, size: 18, top: "40%", right: "32%", rotate: 0, color: "var(--husky-purple)", opacity: 0.35 },
  { Icon: Sparkle, size: 12, bottom: "22%", right: "40%", rotate: 0, color: "var(--herb)", opacity: 0.4 },
];

export function FoodBackdrop() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10"
      aria-hidden
    >
      {SCATTER.map(({ Icon, size, top, bottom, left, right, rotate, color, opacity }, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top,
            bottom,
            left,
            right,
            color,
            opacity,
            transform: `rotate(${rotate}deg)`,
          }}
        >
          <Icon size={size} />
        </div>
      ))}
    </div>
  );
}
