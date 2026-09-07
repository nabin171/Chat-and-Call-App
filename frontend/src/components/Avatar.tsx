"use client";

import { gradientFor, initials } from "@/lib/ui";

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({
  name,
  seed,
  size = "md",
  online,
  square,
}: {
  name: string;
  seed?: string | number;
  size?: Size;
  online?: boolean;
  square?: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        aria-hidden
        style={{ backgroundImage: gradientFor(seed ?? name) }}
        className={`${SIZES[size]} ${square ? "rounded-xl" : "rounded-full"} inline-flex items-center justify-center font-semibold tracking-wide text-white select-none`}
      >
        {initials(name)}
      </span>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-surface ${
            size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
          } ${online ? "bg-online" : "bg-muted/50"}`}
        />
      )}
    </span>
  );
}
