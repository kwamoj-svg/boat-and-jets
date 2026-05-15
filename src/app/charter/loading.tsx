import { Navbar } from "@/components/Navbar";

export default function CharterLoading() {
  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Hero skeleton */}
        <div className="text-center mb-12">
          <div className="h-8 w-72 bg-white/[0.06] rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-5 w-96 bg-white/[0.04] rounded-md mx-auto animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-8 border border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden"
            >
              <div className="aspect-[4/3] bg-white/[0.05] animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 bg-white/[0.06] rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-white/[0.04] rounded animate-pulse" />
                <div className="flex gap-2 pt-2">
                  <div className="h-3 w-12 bg-white/[0.04] rounded animate-pulse" />
                  <div className="h-3 w-12 bg-white/[0.04] rounded animate-pulse" />
                  <div className="h-3 w-12 bg-white/[0.04] rounded animate-pulse" />
                </div>
                <div className="h-6 w-24 bg-gold/10 rounded animate-pulse mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
