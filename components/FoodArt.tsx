import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (p: IconProps) => ({
  ...p,
  width: p.size ?? 24,
  height: p.size ?? 24,
  viewBox: "0 0 48 48",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
});

const stroke = {
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ChefHat(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path
        {...stroke}
        d="M12 24c-4 0-7-3-7-7s3-7 6-7c0-3 3-6 7-6s7 3 7 6c3 0 6 3 6 7s-3 7-7 7"
      />
      <path {...stroke} d="M12 24h18v14c0 1-1 2-2 2H14c-1 0-2-1-2-2V24z" />
      <path {...stroke} d="M17 29v6M24 29v6M27 29v6" opacity="0.5" />
    </svg>
  );
}

export function PizzaSlice(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path
        {...stroke}
        d="M8 10l16 32L40 10 24 6 8 10z"
        fill="var(--cheese, #f4b942)"
        fillOpacity="0.6"
      />
      <circle cx="18" cy="16" r="2" fill="var(--tomato, #e85a4f)" />
      <circle cx="28" cy="18" r="2" fill="var(--tomato, #e85a4f)" />
      <circle cx="22" cy="26" r="2" fill="var(--tomato, #e85a4f)" />
      <circle cx="30" cy="28" r="1.5" fill="var(--herb, #6ba368)" />
    </svg>
  );
}

export function Bowl(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path
        {...stroke}
        d="M6 22h36c0 10-8 18-18 18S6 32 6 22z"
        fill="var(--cream, #fff5e4)"
      />
      <path {...stroke} d="M4 22h40" />
      <path {...stroke} d="M16 14c0 2 2 3 2 5M24 10c0 3 2 4 2 6M32 14c0 2 2 3 2 5" opacity="0.5" />
    </svg>
  );
}

export function Cookie(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="24" cy="24" r="18" {...stroke} fill="var(--crust, #d9a771)" fillOpacity="0.5" />
      <circle cx="18" cy="20" r="2" fill="var(--foreground, #1a1a1a)" />
      <circle cx="30" cy="22" r="2" fill="var(--foreground, #1a1a1a)" />
      <circle cx="22" cy="30" r="2" fill="var(--foreground, #1a1a1a)" />
      <circle cx="30" cy="32" r="1.5" fill="var(--foreground, #1a1a1a)" />
      <circle cx="16" cy="28" r="1.5" fill="var(--foreground, #1a1a1a)" />
    </svg>
  );
}

export function Mug(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path
        {...stroke}
        d="M10 14h22v22c0 2-2 4-4 4H14c-2 0-4-2-4-4V14z"
        fill="var(--surface, #fff)"
      />
      <path {...stroke} d="M32 20h4a4 4 0 010 8h-4" />
      <path {...stroke} d="M16 8c0 2-2 2-2 4M22 8c0 2-2 2-2 4M28 8c0 2-2 2-2 4" opacity="0.6" />
    </svg>
  );
}

export function Pot(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path {...stroke} d="M4 16h40" />
      <path {...stroke} d="M2 14h6M40 14h6" />
      <path
        {...stroke}
        d="M8 16v18c0 3 2 6 5 6h22c3 0 5-3 5-6V16H8z"
        fill="var(--husky-purple, #4b2e83)"
        fillOpacity="0.1"
      />
      <path {...stroke} d="M18 6c0 3-3 3-3 6M26 4c0 3-3 3-3 6" opacity="0.5" />
    </svg>
  );
}

export function Carrot(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path
        {...stroke}
        d="M14 34L34 14c-6-2-14-2-18 2s-4 12-2 18z"
        fill="var(--tomato, #e85a4f)"
        fillOpacity="0.5"
      />
      <path {...stroke} d="M34 14l4-4M34 14l8 0M34 14l-2-6" />
      <path {...stroke} d="M20 24l4 4M18 28l2 2M24 20l4 4" opacity="0.4" />
    </svg>
  );
}

export function Cupcake(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path
        {...stroke}
        d="M12 24h24l-4 16c0 1-1 2-2 2H18c-1 0-2-1-2-2l-4-16z"
        fill="var(--crust, #d9a771)"
        fillOpacity="0.5"
      />
      <path
        {...stroke}
        d="M24 6c-8 0-12 4-12 10 0 4 2 8 12 8s12-4 12-8c0-6-4-10-12-10z"
        fill="var(--tomato, #e85a4f)"
        fillOpacity="0.5"
      />
      <circle cx="24" cy="6" r="2" fill="var(--cheese, #f4b942)" />
    </svg>
  );
}

export function Sparkle(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path
        d="M24 4l3 15 15 3-15 3-3 15-3-15-15-3 15-3z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Bread(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path
        {...stroke}
        d="M6 22c0-8 8-12 18-12s18 4 18 12c0 2-2 4-4 4v10c0 2-2 4-4 4H14c-2 0-4-2-4-4V26c-2 0-4-2-4-4z"
        fill="var(--crust, #d9a771)"
        fillOpacity="0.4"
      />
      <path {...stroke} d="M16 18c0 3-2 3-2 6M24 16c0 3-2 3-2 6M32 18c0 3-2 3-2 6" opacity="0.5" />
    </svg>
  );
}

export const ALL_FOOD_ICONS = [
  PizzaSlice,
  Bowl,
  Cookie,
  Mug,
  Pot,
  Carrot,
  Cupcake,
  Bread,
] as const;
