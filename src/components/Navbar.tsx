"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { SearchInput } from "./SearchInput";
import { AuthButton } from "./AuthButton";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
  showSearch?: boolean;
  searchQuery?: string;
}

interface PartnerState {
  isPartner: boolean;
  status: string | null;
}

export function Navbar({ showSearch = false, searchQuery }: NavbarProps) {
  const [partner, setPartner] = useState<PartnerState>({ isPartner: false, status: null });

  useEffect(() => {
    let mounted = true;
    fetch("/api/me/partner", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data) setPartner(data);
      })
      .catch(() => { /* silent */ });
    return () => { mounted = false; };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Logo size="small" />

          {showSearch && (
            <div className="flex-1 max-w-xl hidden sm:block">
              <SearchInput initialValue={searchQuery} />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Link
              href="/charter"
              className="text-sm text-gray-400 hover:text-gold-light transition-colors hidden sm:block"
            >
              Charter
            </Link>
            <Link
              href="/sale"
              className="text-sm text-gray-400 hover:text-gold-light transition-colors hidden sm:block"
            >
              Kaufen
            </Link>
            <Link
              href="/network"
              className="text-sm text-gray-400 hover:text-gold-light transition-colors hidden sm:block"
            >
              Network
            </Link>
            <Link
              href="/crm"
              className="text-sm text-gray-400 hover:text-gold-light transition-colors hidden sm:block"
            >
              CRM
            </Link>
            {partner.isPartner ? (
              <Link
                href="/partner"
                className="text-sm text-gold/80 hover:text-gold transition-colors hidden sm:flex items-center gap-1.5"
                title={partner.status === "approved" ? "Mein Unternehmen" : "Mein Unternehmen (Verifizierung läuft)"}
              >
                Mein Unternehmen
                {partner.status === "pending" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                    ●
                  </span>
                )}
              </Link>
            ) : (
              <Link
                href="/partner/register"
                className="text-sm text-gray-400 hover:text-gold-light transition-colors hidden sm:block"
              >
                For Business
              </Link>
            )}
            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
