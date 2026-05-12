import { Navbar } from "@/components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "Datenschutz — BOAT",
  description: "Datenschutzerklarung von BOAT - AI-Powered Yacht Discovery",
};

export default function DatenschutzPage() {
  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-light text-white mb-8">Datenschutzerkl&auml;rung</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">1. Verantwortlicher</h2>
            <p>
              Jerome Kwa<br />
              E-Mail: kontakt@boat-discovery.com
            </p>
            <p>
              (Vollst&auml;ndige Angaben siehe <Link href="/impressum" className="text-gold-light hover:text-gold underline">Impressum</Link>)
            </p>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
            <p>
              BOAT ist eine Suchmaschine f&uuml;r Yacht- und Bootsvermietung. Wir verarbeiten so wenig
              personenbezogene Daten wie m&ouml;glich (Grundsatz der Datenminimierung gem. Art. 5 Abs. 1 lit. c DSGVO).
            </p>
            <h3 className="text-lg text-white font-medium mt-4 mb-2">Was wir NICHT speichern:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Suchanfragen werden nicht personenbezogen gespeichert</li>
              <li>Kein Logging von Chat-Inhalten oder Nutzer-Input</li>
              <li>Keine Benutzerkonten oder Profile</li>
              <li>Keine Zahlungsdaten</li>
              <li>Keine Standortdaten</li>
            </ul>
            <h3 className="text-lg text-white font-medium mt-4 mb-2">Was wir verarbeiten:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Technische Zugriffsdaten (IP-Adresse, Browser-Typ) durch unseren Hosting-Provider zum Betrieb der Website</li>
              <li>Anonymisierte, aggregierte Nutzungsstatistiken</li>
              <li>Bootsdaten (keine personenbezogenen Daten) zur Verbesserung der Suchergebnisse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">3. KI-Verarbeitung (EU AI Act)</h2>
            <p>
              BOAT verwendet k&uuml;nstliche Intelligenz (KI) zur Verarbeitung von Suchanfragen und zur
              Erstellung von Bootsempfehlungen. Gem&auml;&szlig; dem EU AI Act (Verordnung (EU) 2024/1689)
              weisen wir darauf hin:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Empfehlungen werden durch KI erstellt und k&ouml;nnen Fehler enthalten</li>
              <li>Suchanfragen werden von KI-Modellen (Anthropic Claude) verarbeitet, aber nicht persistent gespeichert</li>
              <li>Die KI-Verarbeitung dient ausschlie&szlig;lich der Suche und Empfehlung, nicht der Entscheidungsfindung mit rechtlichen Auswirkungen</li>
              <li>Wir verwenden keine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">4. Cookies</h2>
            <p>
              BOAT verwendet ausschlie&szlig;lich technisch notwendige Cookies f&uuml;r den Betrieb der Website.
              Wir setzen keine Marketing- oder Tracking-Cookies ein.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Technisch notwendige Cookies:</strong> F&uuml;r die Grundfunktionalit&auml;t der Website (Session-Management)</li>
              <li><strong>Keine Tracking-Cookies:</strong> Wir verwenden kein Google Analytics, Facebook Pixel oder &auml;hnliche Tracking-Dienste</li>
              <li><strong>Cookie-Einstellungen:</strong> Sie k&ouml;nnen Cookies jederzeit in Ihren Browser-Einstellungen verwalten</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">5. Externe Links &amp; Affiliate-Programm</h2>
            <p>
              BOAT enth&auml;lt Links zu externen Boots- und Yachtvermietungsplattformen. Einige dieser Links
              k&ouml;nnen Affiliate-Links sein, f&uuml;r die wir eine Provision erhalten. Diese Links sind
              entsprechend gekennzeichnet.
            </p>
            <p>
              F&uuml;r die Datenschutzpraktiken externer Websites sind wir nicht verantwortlich. Bitte lesen
              Sie die Datenschutzerkl&auml;rungen der jeweiligen Anbieter.
            </p>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">6. Hosting</h2>
            <p>
              Diese Website wird bei Render (Render Services, Inc.) gehostet. Die Datenbank wird bei
              Supabase (Supabase, Inc.) betrieben. Beide Anbieter k&ouml;nnen technische Zugriffsdaten
              verarbeiten. Weitere Informationen finden Sie in deren Datenschutzerkl&auml;rungen.
            </p>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">7. Ihre Rechte</h2>
            <p>Sie haben gem&auml;&szlig; DSGVO folgende Rechte:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
              <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
              <li>Recht auf L&ouml;schung (Art. 17 DSGVO)</li>
              <li>Recht auf Einschr&auml;nkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Recht auf Daten&uuml;bertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-3">
              Kontakt: kontakt@boat-discovery.com
            </p>
            <p>
              Beschwerderecht bei einer Aufsichtsbeh&ouml;rde gem. Art. 77 DSGVO.
            </p>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">8. Datenminimierung</h2>
            <p>
              Wir folgen dem Grundsatz der Datenminimierung. Suchanfragen werden session-basiert
              verarbeitet und nicht personenbezogen gespeichert. Bootsdaten werden zur Verbesserung
              der Suchergebnisse anonymisiert zwischengespeichert.
            </p>
          </section>

          <p className="text-gray-500 text-xs mt-10">Stand: Mai 2025</p>
        </div>
      </div>
    </main>
  );
}
