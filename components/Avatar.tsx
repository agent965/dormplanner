import { avatarColor, initialFor } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = 48,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.max(10, Math.floor(size * 0.42)),
  };
  if (src) {
    return (
      <span
        className={cn(
          "inline-block rounded-full bg-[color:var(--border)] overflow-hidden shrink-0 border border-[color:var(--border)]",
          className
        )}
        style={style}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 border border-black/5",
        className
      )}
      style={{ ...style, background: avatarColor(name) }}
      aria-label={name}
    >
      {initialFor(name)}
    </span>
  );
}
