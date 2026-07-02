import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/60 px-6 py-16 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 size-[400px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Your next interview starts with practice.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Free to start. No credit card. Just you and an interviewer that
              actually pushes back.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/signup">
                Start practicing <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Prepr. Practice, out loud.</p>
        </div>
      </footer>
    </>
  );
}
