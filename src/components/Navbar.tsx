"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { SearchInput } from "./SearchInput";
import { AuthButton } from "./AuthButton";
import { NotificationBell } from "./NotificationBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useT } from "@/lib/i18n/LanguageProvider";

interface NavbarProps {
  showSearch?: boolean;
  searchQuery?: string;
}

interface PartnerState {
  isPartner: boolean;
  status: string | null;
}

/** Returns Tailwind classes for a nav link based on whether it matches the
 *  current pathname.  Active links get the gold treatment. */
function navLinkClass(active: boolean): string {
  return active
    ? "text-sm text-gold font-medium hidden sm:flex items-center gap-1.5 transition-colors relative after:absolute after:left-0 after:right-0 after:-bottom-[20px] after:h-0.5 after:bg-gold after:rounded-t"
    : "text-sm text-gray-400 hover:text-gold-light transition-colors hidden sm:block";
}

export function Navbar({ showSearch = false, searchQuery }: NavbarProps) {
  const pathname = usePathname() || "/";
  const { t } = useT();
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

  // Match active section — "/charter/abc-123" still highlights "Charter"
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const partnerActive = isActive("/partner");

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

          <div className="flex items-center gap-5">
            <Link href="/charter" className={navLinkClass(isActive("/charter"))}>
              {t("nav.charter")}
            </Link>
            <Link href="/sale" className={navLinkClass(isActive("/sale"))}>
              {t("nav.buy")}
            </Link>
            <Link href="/network" className={navLinkClass(isActive("/network"))}>
              {t("nav.network")}
            </Link>
            <Link href="/crm" className={navLinkClass(isActive("/crm"))}>
              {t("nav.crm")}
            </Link>
            {partner.isPartner ? (
              <Link
                href="/partner"
                className={
                  partnerActive
                    ? "text-sm text-gold font-medium hidden sm:flex items-center gap-1.5 transition-colors relative after:absolute after:left-0 after:right-0 after:-bottom-[20px] after:h-0.5 after:bg-gold after:rounded-t"
                    : "text-sm text-gold/80 hover:text-gold transition-colors hidden sm:flex items-center gap-1.5"
                }
                title={t("nav.myCompany")}
              >
                {t("nav.myCompany")}
                {partner.status === "pending" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                    ●
                  </span>
                )}
              </Link>
            ) : (
              <Link
                href="/partner/register"
                className={navLinkClass(isActive("/partner"))}
              >
                {t("nav.business")}
              </Link>
            )}
            <LanguageSwitcher />
            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
