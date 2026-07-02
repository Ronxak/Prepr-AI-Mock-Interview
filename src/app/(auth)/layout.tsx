import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-dvh place-items-center px-5 py-10">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 size-[420px] -translate-x-1/2 rounded-full bg-primary/15 blur-[130px]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
      </div>
    </main>
  );
}
