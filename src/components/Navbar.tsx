"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { SearchInput } from "./SearchInput";
import { AuthButton } from "./AuthButton";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
  showSearch?: boolean;
  searchQuery?: string;
}

export function Navbar({ showSearch = false, searchQuery }: NavbarProps) {
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
              href="/partner/register"
              className="text-sm text-gray-400 hover:text-gold-light transition-colors hidden sm:block"
            >
              For Business
            </Link>
            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
