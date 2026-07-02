import Link from "next/link";
import { cn } from "@/lib/utils";

/** Prepr wordmark + glyph. The glyph is a stylized soundwave (voice-first). */
export function Logo({
  href = "/",
  className,
  showWordmark = true,
}: {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="relative grid size-8 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
        <svg viewBox="0 0 24 24" className="size-4 text-primary" aria-hidden>
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M5 9v6" />
            <path d="M9.5 5.5v13" />
            <path d="M14.5 8v8" />
            <path d="M19 10.5v3" />
          </g>
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Prepr
        </span>
      )}
    </Link>
  );
}
