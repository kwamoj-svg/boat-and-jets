"use client";

import { useState } from "react";
import AdminDataTable, { RoleBadge, DateCell } from "../AdminDataTable";
import { Check, Shield } from "lucide-react";

export default function AdminUsersPage() {
  const [editingUser, setEditingUser] = useState<Record<string, unknown> | null>(null);

  async function updateRole(id: string, role: string) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "profiles", id, updates: { role } }),
    });
    setEditingUser(null);
    window.location.reload();
  }

  return (
    <>
      <AdminDataTable
        title="Benutzer"
        entity="users"
        columns={[
          { key: "display_name", label: "Name", render: (v) => (
            <span className="text-white font-medium">{(v as string) || "Kein Name"}</span>
          )},
          { key: "role", label: "Rolle", render: (v) => <RoleBadge role={v as string} /> },
          { key: "preferred_currency", label: "Währung" },
          { key: "language", label: "Sprache", render: (v) => (
            <span className="uppercase text-xs">{v as string}</span>
          )},
          { key: "notification_email", label: "E-Mail Benachr.", render: (v) => (
            v ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-gray-600">—</span>
          )},
          { key: "created_at", label: "Registriert", render: (v) => <DateCell date={v as string} /> },
        ]}
        actions={[
          {
            label: "Zum Admin machen",
            icon: Shield,
            variant: "success",
            onClick: (row) => updateRole(row.id as string, "admin"),
            show: (row) => row.role !== "admin",
          },
          {
            label: "Admin entfernen",
            icon: Shield,
            variant: "danger",
            onClick: (row) => updateRole(row.id as string, "user"),
            show: (row) => row.role === "admin",
          },
        ]}
      />

      {/* Edit Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={() => { setEditingUser(null); window.location.reload(); }}
        />
      )}
    </>
  );
}

function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: Record<string, unknown>;
  onClose: () => void;
  onSave: () => void;
}) {
  const [role, setRole] = useState((user.role as string) || "user");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "profiles",
        id: user.id,
        updates: { role },
      }),
    });
    setSaving(false);
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0f1729] border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-white mb-4">Benutzer bearbeiten</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Name</label>
            <div className="text-white">{(user.display_name as string) || "—"}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Rolle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="user">User</option>
              <option value="partner">Partner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white">
            Abbrechen
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-gold/20 border border-gold/30 text-gold text-sm hover:bg-gold/30 disabled:opacity-50">
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
