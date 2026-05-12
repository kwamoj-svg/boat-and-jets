"use client";

import { Logo } from "./Logo";
import { SearchInput } from "./SearchInput";

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

          <div className="flex items-center gap-4">
            <button className="text-sm text-gray-400 hover:text-white transition-colors">
              For Business
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
