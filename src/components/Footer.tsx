import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-6 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-500 tracking-wider">
          VELIQA — THE FUTURE OF YACHT DISCOVERY
        </p>
        <nav className="flex items-center gap-4 text-xs text-gray-500">
          <Link href="/datenschutz" className="hover:text-gray-300 transition-colors">
            Datenschutz
          </Link>
          <span className="text-gray-700">|</span>
          <Link href="/impressum" className="hover:text-gray-300 transition-colors">
            Impressum
          </Link>
        </nav>
      </div>
    </footer>
  );
}
