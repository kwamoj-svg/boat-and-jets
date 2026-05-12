"use client";

import { useState } from "react";
import { registerPartner } from "@/app/actions/partner";
import { Building2, Ship, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PartnerRegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await registerPartner(formData);

    if (result && "error" in result && result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">
          Registrierung erfolgreich!
        </h2>
        <p className="text-gray-300 mb-6">
          Deine Partner-Registrierung wird geprüft. Du erhältst eine
          Benachrichtigung, sobald dein Konto freigeschaltet wurde. Die
          Verifizierung dauert in der Regel 1-2 Werktage.
        </p>
        <Link
          href="/partner"
          className="inline-block px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-navy font-semibold rounded-lg hover:opacity-90 transition"
        >
          Zum Partner-Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-semibold text-white">Partner werden</h1>
      </div>
      <p className="text-gray-400 mb-6 text-sm">
        Registriere dein Unternehmen und liste deine Boote auf VELIQA.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Firmenname *
          </label>
          <input
            name="company_name"
            required
            className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition"
            placeholder="Meine Yacht GmbH"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Unternehmensart *
          </label>
          <select
            name="company_type"
            required
            className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-gold/50 transition"
          >
            <option value="">Bitte wählen...</option>
            <option value="charter_company">Charter-Unternehmen</option>
            <option value="broker">Broker / Makler</option>
            <option value="dealer">Händler</option>
            <option value="marina">Marina</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">E-Mail *</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition"
              placeholder="info@firma.de"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Telefon</label>
            <input
              name="phone"
              type="tel"
              className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition"
              placeholder="+49 123 456789"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Website</label>
          <input
            name="website"
            type="url"
            className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition"
            placeholder="https://www.firma.de"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Adresse</label>
          <input
            name="address"
            className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition"
            placeholder="Hafenstraße 1"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Stadt</label>
            <input
              name="city"
              className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition"
              placeholder="Hamburg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Land</label>
            <input
              name="country"
              className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition"
              placeholder="Deutschland"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Steuernummer / USt-IdNr.
          </label>
          <input
            name="tax_id"
            className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition"
            placeholder="DE123456789"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Beschreibung
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition resize-none"
            placeholder="Beschreibe dein Unternehmen kurz..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-gold to-gold-light text-navy font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Ship className="w-5 h-5" />
          {loading ? "Wird registriert..." : "Als Partner registrieren"}
        </button>
      </form>
    </div>
  );
}
