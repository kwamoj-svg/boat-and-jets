"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import {
  ChevronLeft, ChevronRight, Search, RefreshCw,
  MoreVertical, Check, X, Pencil, Trash2,
} from "lucide-react";

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
  width?: string;
}

interface Action {
  label: string;
  icon?: React.ElementType;
  onClick: (row: Record<string, unknown>) => void;
  variant?: "default" | "danger" | "success";
  show?: (row: Record<string, unknown>) => boolean;
}

interface AdminDataTableProps {
  title: string;
  entity: string;
  columns: Column[];
  actions?: Action[];
  filters?: ReactNode;
  extraParams?: Record<string, string>;
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
}

export default function AdminDataTable({
  title,
  entity,
  columns,
  actions = [],
  filters,
  extraParams = {},
  onEdit,
  onDelete,
}: AdminDataTableProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ entity, page: String(page), ...extraParams });
    if (search) params.set("q", search);

    try {
      const res = await fetch(`/api/admin?${params}`);
      const json = await res.json();
      setData(json.results || []);
      setTotal(json.total || json.results?.length || 0);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [entity, page, search, extraParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-white">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{total} Einträge</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold/30"
          />
        </div>
        {filters}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-xs text-gray-500 font-normal px-4 py-3 bg-white/[0.02]"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
              {(actions.length > 0 || onEdit || onDelete) && (
                <th className="w-12 px-4 py-3 bg-white/[0.02]" />
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                  <td />
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-gray-500">
                  Keine Einträge gefunden
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const id = row.id as string;
                return (
                  <tr
                    key={id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-gray-300">
                        {col.render
                          ? col.render(row[col.key], row)
                          : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                    {(actions.length > 0 || onEdit || onDelete) && (
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === id ? null : id)}
                          className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeMenu === id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-4 top-10 z-20 bg-[#0f1729] border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]">
                              {onEdit && (
                                <button
                                  onClick={() => { setActiveMenu(null); onEdit(row); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Bearbeiten
                                </button>
                              )}
                              {actions.filter(a => !a.show || a.show(row)).map((action) => {
                                const Icon = action.icon;
                                return (
                                  <button
                                    key={action.label}
                                    onClick={() => { setActiveMenu(null); action.onClick(row); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 ${
                                      action.variant === "danger"
                                        ? "text-red-400 hover:text-red-300"
                                        : action.variant === "success"
                                        ? "text-emerald-400 hover:text-emerald-300"
                                        : "text-gray-300 hover:text-white"
                                    }`}
                                  >
                                    {Icon && <Icon className="w-3.5 h-3.5" />}
                                    {action.label}
                                  </button>
                                );
                              })}
                              {onDelete && (
                                <button
                                  onClick={() => { setActiveMenu(null); onDelete(row); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Löschen
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Seite {page} von {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable cell renderers ──

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    inactive: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    deleted: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-gold/10 text-gold border-gold/20",
    partner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    user: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${colors[role] || colors.user}`}>
      {role}
    </span>
  );
}

export function DateCell({ date }: { date: string }) {
  if (!date) return <span className="text-gray-600">—</span>;
  return (
    <span className="text-gray-400 text-xs">
      {new Date(date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
    </span>
  );
}

export function TruncatedText({ text, max = 40 }: { text: string; max?: number }) {
  if (!text) return <span className="text-gray-600">—</span>;
  return (
    <span className="text-gray-300" title={text}>
      {text.length > max ? text.slice(0, max) + "…" : text}
    </span>
  );
}
