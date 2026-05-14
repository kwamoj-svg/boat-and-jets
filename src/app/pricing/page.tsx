"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Check, X, Sparkles, Crown, Ship, Briefcase } from "lucide-react";

interface Tier {
  id: string;
  name: string;
  badge?: string;
  price: number;
  period: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
  features: { label: string; included: boolean }[];
}

const USER_TIERS: Tier[] = [
  {
    id: "free",
    name: "Entdecker",
    price: 0,
    period: "kostenlos",
    description: "Für alle, die ab und zu ein Boot mieten",
    ctaLabel: "Loslegen",
    ctaHref: "/signup",
    features: [
      { included: true, label: "Suche & Katalog komplett zugänglich" },
      { included: true, label: "Bis zu 10 Boote im CRM speichern" },
      { included: true, label: "1 aktiver Modell-Alert" },
      { included: true, label: "Direkter Anbieter-Kontakt" },
      { included: false, label: "Priorisierte Buchungs-Anfragen" },
      { included: false, label: "VELIQA-Concierge" },
    ],
  },
  {
    id: "plus",
    name: "Plus",
    badge: "Beliebt",
    price: 9.9,
    period: "/Monat",
    description: "Für aktive Boots-Liebhaber & Kapitäne",
    ctaLabel: "Plus abonnieren",
    ctaHref: "/signup?plan=plus",
    highlight: true,
    features: [
      { included: true, label: "Alles aus Entdecker" },
      { included: true, label: "Unbegrenzt Boote im CRM" },
      { included: true, label: "10 aktive Modell-Alerts mit E-Mail-Benachrichtigung" },
      { included: true, label: "Suchen speichern & teilen" },
      { included: true, label: "Priorisierte Buchungs-Anfragen" },
      { included: true, label: "Premium-Filter: Zustand, Refit, Motorstunden" },
      { included: false, label: "Persönlicher Concierge" },
    ],
  },
  {
    id: "concierge",
    name: "Concierge",
    badge: "Premium",
    price: 49,
    period: "/Monat",
    description: "Persönlicher Service für hochwertige Charter & Käufe",
    ctaLabel: "Concierge anfragen",
    ctaHref: "/contact?plan=concierge",
    features: [
      { included: true, label: "Alles aus Plus" },
      { included: true, label: "Persönlicher Yacht-Concierge" },
      { included: true, label: "Verhandlung & Buchung in deinem Namen" },
      { included: true, label: "Inspektions-Berichte für Kaufboote" },
      { included: true, label: "24/7 WhatsApp-Support" },
      { included: true, label: "Exklusive Off-Market-Listings" },
      { included: true, label: "Bis zu 5% Rabatt bei Charter-Partnern" },
    ],
  },
];

const PARTNER_TIERS: Tier[] = [
  {
    id: "p-free",
    name: "Listing",
    price: 0,
    period: "kostenlos",
    description: "Für Charter-Anbieter mit kleiner Flotte",
    ctaLabel: "Jetzt registrieren",
    ctaHref: "/partner/register",
    features: [
      { included: true, label: "Bis zu 5 Boote im Katalog" },
      { included: true, label: "Anfragen direkt vom Kunden" },
      { included: true, label: "Basis-Analytics" },
      { included: false, label: "Featured-Platzierung" },
      { included: false, label: "Lead-Agent" },
    ],
  },
  {
    id: "p-pro",
    name: "Pro",
    badge: "Empfohlen",
    price: 49,
    period: "/Monat",
    description: "Für Charter-Unternehmen mit größerer Flotte",
    ctaLabel: "Pro starten",
    ctaHref: "/partner/register?plan=pro",
    highlight: true,
    features: [
      { included: true, label: "Unbegrenzt Boote im Katalog" },
      { included: true, label: "Featured-Platzierung in Suchergebnissen" },
      { included: true, label: "Detail-Analytics: Klicks, Suchen, Conversion" },
      { included: true, label: "Bild-Upload (bis zu 20 Bilder/Boot)" },
      { included: true, label: "Echtzeit-Verfügbarkeit & Buchungs-API" },
      { included: false, label: "Lead-Agent: aktive Kunden-Akquise" },
    ],
  },
  {
    id: "p-broker",
    name: "Broker",
    badge: "Lead-Gen",
    price: 199,
    period: "/Monat",
    description: "Für Yachtbroker & Verkaufsagenten",
    ctaLabel: "Broker werden",
    ctaHref: "/partner/register?plan=broker",
    features: [
      { included: true, label: "Alles aus Pro" },
      { included: true, label: "Broker-Agent: stündliche Lead-Generierung" },
      { included: true, label: "Social-Media-Monitoring (Instagram, FB, LinkedIn, Reddit)" },
      { included: true, label: "AI-Qualitäts-Score pro Lead" },
      { included: true, label: "Direkter Kontakt-Export (Phone, E-Mail, Handle)" },
      { included: true, label: "Eigene Marken-Seite mit allen Verkaufslistings" },
      { included: true, label: "10% Provisions-Beteiligung an Charter-Buchungen" },
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs mb-4">
            <Sparkles className="w-3 h-3" />
            Transparente Preise
          </div>
          <h1 className="text-3xl sm:text-5xl font-light text-white mb-3">
            Preise &amp; Mitgliedschaften
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Such, finde, buche oder vermiete. Wähle den Plan, der zu dir passt — jederzeit kündbar.
          </p>
        </div>

        {/* Customer tiers */}
        <div className="mb-16">
          <h2 className="text-white text-xl font-light mb-6 flex items-center gap-2">
            <Ship className="w-5 h-5 text-gold" />
            Für Kunden
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {USER_TIERS.map((t) => (
              <TierCard key={t.id} tier={t} />
            ))}
          </div>
        </div>

        {/* Partner tiers */}
        <div className="mb-12">
          <h2 className="text-white text-xl font-light mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-gold" />
            Für Charter-Anbieter &amp; Broker
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PARTNER_TIERS.map((t) => (
              <TierCard key={t.id} tier={t} />
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-16 space-y-3">
          <h2 className="text-white text-xl font-light mb-4">Häufige Fragen</h2>
          <FAQ q="Kann ich jederzeit kündigen?" a="Ja — kein Vertrag, monatlich kündbar in deinem Profil." />
          <FAQ q="Brauche ich ein Abo um Boote zu suchen?" a="Nein. Suche und Buchung der Boote bei den jeweiligen Anbietern sind komplett kostenlos. Abos schalten Komfort-Features wie CRM, Alerts, Concierge frei." />
          <FAQ q="Welche Zahlungsmethoden?" a="SEPA-Lastschrift, Kreditkarte (Visa/Mastercard), PayPal. Stripe als Payment-Provider." />
          <FAQ q="Geld-zurück-Garantie?" a="30 Tage volle Rückerstattung bei Plus & Concierge — ohne Wenn und Aber." />
          <FAQ q="Wie funktioniert die Provision für Charter-Partner?" a="0% bis 50€ Buchungswert, 3–10% darüber je nach Plan. Transparent ausgewiesen vor jeder Buchung." />
        </div>
      </div>

      <Footer />
    </main>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  return (
    <div
      className={`relative rounded-2xl p-6 border transition-all ${
        tier.highlight
          ? "border-gold/40 bg-gradient-to-b from-gold/[0.06] to-white/[0.02]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {tier.badge && (
        <span
          className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-medium ${
            tier.highlight
              ? "bg-gold text-navy"
              : "bg-white/10 text-white border border-white/20"
          }`}
        >
          {tier.badge}
        </span>
      )}
      <div className="mb-5">
        <div className="flex items-baseline gap-2 mb-1">
          <h3 className="text-white text-xl font-medium">{tier.name}</h3>
          {tier.id === "concierge" && <Crown className="w-4 h-4 text-gold" />}
        </div>
        <p className="text-xs text-gray-500">{tier.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl text-white font-light">
          {tier.price === 0 ? "€0" : `€${tier.price.toString().replace(".", ",")}`}
        </span>
        <span className="text-gray-500 text-sm ml-1">{tier.period}</span>
      </div>

      <ul className="space-y-2 mb-6">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {f.included ? (
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <X className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
            )}
            <span className={f.included ? "text-gray-300" : "text-gray-600 line-through"}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={tier.ctaHref}
        className={`block text-center px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          tier.highlight
            ? "bg-gradient-to-r from-gold to-gold-light text-navy hover:opacity-90"
            : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
        }`}
      >
        {tier.ctaLabel}
      </Link>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-white/[0.02] border border-white/5 rounded-xl p-4">
      <summary className="cursor-pointer text-white text-sm font-medium flex items-center justify-between">
        {q}
        <span className="text-gray-500 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <p className="text-gray-400 text-sm mt-3">{a}</p>
    </details>
  );
}
