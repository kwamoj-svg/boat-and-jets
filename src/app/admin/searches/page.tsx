"use client";

import { useState, useEffect } from "react";
import { Search, Clock, Trash2, RefreshCw } from "lucide-react";
import { DateCell } from "../AdminDataTable";

interface SearchEntry {
  id: string;
  query_text: string;
  created_at: string;
  expires_at: string;
}

export default function AdminSearchesPage() {
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchSearches() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin?entity=searches");
      const data = await res.json();
      setSearches(data.results || []);
    } catch {
      setSearches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSearches();
  }, []);

  async function deleteSearch(id: string) {
    await fetch(`/api/admin?entity=search_cache&id=${id}`, { method: "DELETE" });
    setSearches(searches.filter((s) => s.id !== id));
  }

  const now = new Date();

  return (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-white">Such-Cache</h1>
          <p className="text-sm text-gray-500 mt-1">{searches.length} gecachte Suchen</p>
        </div>
        <button
          onClick={fetchSearches}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-14 bg-white/[0.03] rounded-xl border border-white/[0.06] animate-pulse" />
          ))
        ) : searches.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Search className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p>Keine Suchen im Cache</p>
          </div>
        ) : (
          searches.map((s) => {
            const expired = new Date(s.expires_at) < now;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${
                  expired
                    ? "bg-white/[0.01] border-white/[0.04] opacity-50"
                    : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
                }`}
              >
                <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate">{s.query_text}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <DateCell date={s.created_at} />
                    </span>
                    {expired && (
                      <span className="text-xs text-red-400/60">abgelaufen</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteSearch(s.id)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
