import { cn } from "@/lib/utils";

/** The gradient logo chip, previously inlined in three places. */
export function BrandMark({ size = 33, className }: { size?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-brand grid shrink-0 place-items-center rounded-control", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m8 6-6 6 6 6" />
        <path d="m16 6 6 6-6 6" />
      </svg>
    </div>
  );
}
