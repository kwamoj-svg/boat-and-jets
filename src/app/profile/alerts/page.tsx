"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Bell,
  Plus,
  Trash2,
  Power,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { createAlert, toggleAlert, deleteAlert, getAlerts } from "@/app/actions/user";

interface Alert {
  id: string;
  alert_name: string;
  criteria: {
    boat_type?: string;
    location?: string;
    max_budget?: number;
    keywords?: string[];
  };
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    const data = await getAlerts();
    setAlerts(data as Alert[]);
    setLoading(false);
  }

  async function handleCreateAlert(formData: FormData) {
    startTransition(async () => {
      const result = await createAlert(formData);
      if (!result.error) {
        setShowForm(false);
        await loadAlerts();
      }
    });
  }

  async function handleToggle(alertId: string, currentActive: boolean) {
    // Optimistic update
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, is_active: !currentActive } : a
      )
    );
    startTransition(async () => {
      await toggleAlert(alertId, !currentActive);
    });
  }

  async function handleDelete(alertId: string) {
    // Optimistic update
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    startTransition(async () => {
      await deleteAlert(alertId);
    });
  }

  return (
    <main className="min-h-screen bg-navy pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/profile"
            className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:border-gold/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-light text-white flex items-center gap-3">
              <Bell className="w-6 h-6 text-gold" />
              Notification Alerts
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Get notified when new boats match your criteria
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2.5 rounded-full bg-gradient-to-r from-gold to-gold-light text-navy font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Alert</span>
          </button>
        </div>

        {/* Create Alert Form */}
        {showForm && (
          <div className="glass rounded-2xl p-6 mb-8 animate-fade-in">
            <h3 className="text-lg font-medium text-white mb-4">
              Create New Alert
            </h3>
            <form action={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Alert Name
                </label>
                <input
                  type="text"
                  name="alert_name"
                  required
                  placeholder="e.g. Dream catamaran in Greece"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:border-gold/30 focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Boat Type
                  </label>
                  <select
                    name="boat_type"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-gold/30 focus:outline-none transition-colors"
                  >
                    <option value="">Any type</option>
                    <option value="sailing">Sailing Yacht</option>
                    <option value="motor">Motor Yacht</option>
                    <option value="catamaran">Catamaran</option>
                    <option value="superyacht">Superyacht</option>
                    <option value="gulet">Gulet</option>
                    <option value="speedboat">Speedboat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. Mediterranean, Greece"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:border-gold/30 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Max Budget (EUR)
                  </label>
                  <input
                    type="number"
                    name="max_budget"
                    placeholder="e.g. 15000"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:border-gold/30 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="keywords"
                    placeholder="e.g. jacuzzi, flybridge, new"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:border-gold/30 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-gold to-gold-light text-navy font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Alert
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 rounded-full text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Alerts List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Bell className="w-10 h-10 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No alerts yet</p>
            <p className="text-sm text-gray-500">
              Create an alert to get notified when new boats match your
              criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`glass rounded-2xl p-5 flex items-start gap-4 transition-all ${
                  alert.is_active
                    ? "border-gold/10"
                    : "opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white">
                    {alert.alert_name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {alert.criteria.boat_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold-light capitalize">
                        {alert.criteria.boat_type}
                      </span>
                    )}
                    {alert.criteria.location && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ocean/20 text-ocean-light">
                        {alert.criteria.location}
                      </span>
                    )}
                    {alert.criteria.max_budget && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                        max {alert.criteria.max_budget.toLocaleString()}
                      </span>
                    )}
                    {alert.criteria.keywords?.map((kw) => (
                      <span
                        key={kw}
                        className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                  {alert.last_triggered_at && (
                    <p className="text-xs text-gray-600 mt-2">
                      Last triggered:{" "}
                      {new Date(alert.last_triggered_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(alert.id, alert.is_active)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      alert.is_active
                        ? "bg-gold/10 text-gold hover:bg-gold/20"
                        : "bg-white/5 text-gray-500 hover:text-white"
                    }`}
                    title={alert.is_active ? "Pause alert" : "Activate alert"}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
