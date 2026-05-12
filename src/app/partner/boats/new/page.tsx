"use client";

import { useState } from "react";
import { createPartnerBoat } from "@/app/actions/partner";
import { Ship, Save } from "lucide-react";

export default function NewBoatPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createPartnerBoat(formData);

    if (result && "error" in result && result.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, createPartnerBoat redirects to /partner/boats
  }

  const inputClass =
    "w-full px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition";
  const labelClass = "block text-sm text-gray-300 mb-1";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Ship className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-semibold text-white">
          Neues Boot hinzufügen
        </h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">
            Grundinformationen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input
                name="name"
                required
                className={inputClass}
                placeholder="z.B. Serenity II"
              />
            </div>
            <div>
              <label className={labelClass}>Typ *</label>
              <select name="type" required className={inputClass}>
                <option value="">Bitte wählen...</option>
                <option value="motor_yacht">Motoryacht</option>
                <option value="sailing_yacht">Segelyacht</option>
                <option value="catamaran">Katamaran</option>
                <option value="gulet">Gulet</option>
                <option value="speedboat">Speedboot</option>
                <option value="houseboat">Hausboot</option>
                <option value="other">Sonstige</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Marke</label>
              <input
                name="brand"
                className={inputClass}
                placeholder="z.B. Sunseeker"
              />
            </div>
            <div>
              <label className={labelClass}>Modell</label>
              <input
                name="model"
                className={inputClass}
                placeholder="z.B. Predator 68"
              />
            </div>
            <div>
              <label className={labelClass}>Baujahr</label>
              <input
                name="year"
                type="number"
                min="1950"
                max="2030"
                className={inputClass}
                placeholder="2022"
              />
            </div>
            <div>
              <label className={labelClass}>Länge (ft)</label>
              <input
                name="length_ft"
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="68"
              />
            </div>
            <div>
              <label className={labelClass}>Kabinen</label>
              <input
                name="cabins"
                type="number"
                min="0"
                className={inputClass}
                placeholder="4"
              />
            </div>
            <div>
              <label className={labelClass}>Gäste</label>
              <input
                name="guests"
                type="number"
                min="1"
                className={inputClass}
                placeholder="8"
              />
            </div>
            <div>
              <label className={labelClass}>Crew</label>
              <input
                name="crew"
                type="number"
                min="0"
                className={inputClass}
                placeholder="3"
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">Preise</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Preis pro Tag</label>
              <input
                name="price_per_day"
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="5000"
              />
            </div>
            <div>
              <label className={labelClass}>Preis pro Woche</label>
              <input
                name="price_per_week"
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="30000"
              />
            </div>
            <div>
              <label className={labelClass}>Kaufpreis</label>
              <input
                name="sale_price"
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="2500000"
              />
            </div>
            <div>
              <label className={labelClass}>Währung</label>
              <select name="currency" className={inputClass} defaultValue="EUR">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">Standort</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Region</label>
              <input
                name="region"
                className={inputClass}
                placeholder="z.B. Mittelmeer"
              />
            </div>
            <div>
              <label className={labelClass}>Land</label>
              <input
                name="country"
                className={inputClass}
                placeholder="z.B. Kroatien"
              />
            </div>
            <div>
              <label className={labelClass}>Hafen</label>
              <input
                name="port"
                className={inputClass}
                placeholder="z.B. Split"
              />
            </div>
          </div>
        </section>

        {/* Description & Features */}
        <section className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">
            Beschreibung & Ausstattung
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Beschreibung</label>
              <textarea
                name="description"
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="Beschreibe das Boot, seine Highlights und Besonderheiten..."
              />
            </div>
            <div>
              <label className={labelClass}>
                Ausstattung (kommagetrennt)
              </label>
              <input
                name="features"
                className={inputClass}
                placeholder="Klimaanlage, Jacuzzi, Jet Ski, Tauchausrüstung"
              />
              <p className="text-xs text-gray-500 mt-1">
                Trenne die Merkmale mit Kommas
              </p>
            </div>
          </div>
        </section>

        {/* Images */}
        <section className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">Bilder</h2>
          <div>
            <label className={labelClass}>
              Bild-URLs (eine pro Zeile)
            </label>
            <textarea
              name="images"
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder={"https://example.com/boat1.jpg\nhttps://example.com/boat2.jpg"}
            />
            <p className="text-xs text-gray-500 mt-1">
              Datei-Upload kommt bald. Gib vorerst Bild-URLs ein.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">
            Kontakt für dieses Boot
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Telefon</label>
              <input
                name="contact_phone"
                type="tel"
                className={inputClass}
                placeholder="+49 123 456789"
              />
            </div>
            <div>
              <label className={labelClass}>E-Mail</label>
              <input
                name="contact_email"
                type="email"
                className={inputClass}
                placeholder="charter@firma.de"
              />
            </div>
          </div>
        </section>

        {/* Status & Submit */}
        <section className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" className={inputClass} defaultValue="draft">
                <option value="draft">Entwurf</option>
                <option value="active">Aktiv (sofort sichtbar)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-navy font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? "Wird gespeichert..." : "Boot speichern"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
