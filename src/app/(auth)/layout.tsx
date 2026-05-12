import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen bg-navy flex items-center justify-center">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-light tracking-[0.3em] text-white">
              VELIQA
            </span>
          </Link>
          <p className="text-gray-400 text-sm mt-2">AI-Powered Yacht Discovery</p>
        </div>
        {children}
      </div>
    </main>
  );
}
