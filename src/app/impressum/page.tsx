import { Navbar } from "@/components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "Impressum — VELIQA",
  description: "Impressum von VELIQA (veliqa.life) - AI-Powered Yacht Discovery",
};

export default function ImpressumPage() {
  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-light text-white mb-8">Impressum</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">Angaben gem&auml;&szlig; &sect; 5 TMG</h2>
            <p>
              Jerome Kwa<br />
              VELIQA — AI-Powered Yacht Discovery<br />
              veliqa.life<br />
              <br />
              E-Mail: kontakt@veliqa.life
            </p>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">Verantwortlich f&uuml;r den Inhalt nach &sect; 55 Abs. 2 RStV</h2>
            <p>Jerome Kwa</p>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">Haftungsausschluss</h2>

            <h3 className="text-lg text-white font-medium mt-4 mb-2">Haftung f&uuml;r Inhalte</h3>
            <p>
              Die Inhalte unserer Seiten wurden mit gr&ouml;&szlig;ter Sorgfalt erstellt. F&uuml;r die Richtigkeit,
              Vollst&auml;ndigkeit und Aktualit&auml;t der Inhalte k&ouml;nnen wir jedoch keine Gew&auml;hr &uuml;bernehmen.
              Als Diensteanbieter sind wir gem&auml;&szlig; &sect; 7 Abs. 1 TMG f&uuml;r eigene Inhalte auf diesen
              Seiten nach den allgemeinen Gesetzen verantwortlich.
            </p>

            <h3 className="text-lg text-white font-medium mt-4 mb-2">Haftung f&uuml;r Links</h3>
            <p>
              Unser Angebot enth&auml;lt Links zu externen Websites Dritter, auf deren Inhalte wir keinen
              Einfluss haben. Deshalb k&ouml;nnen wir f&uuml;r diese fremden Inhalte auch keine Gew&auml;hr
              &uuml;bernehmen. F&uuml;r die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
              oder Betreiber der Seiten verantwortlich.
            </p>

            <h3 className="text-lg text-white font-medium mt-4 mb-2">KI-generierte Inhalte</h3>
            <p>
              VELIQA verwendet k&uuml;nstliche Intelligenz zur Erstellung von Bootsempfehlungen und Suchergebnissen.
              Diese KI-generierten Inhalte k&ouml;nnen Fehler oder Ungenauigkeiten enthalten. Preise, Verf&uuml;gbarkeiten
              und Bootsdetails sollten stets beim jeweiligen Anbieter verifiziert werden. VELIQA &uuml;bernimmt keine
              Haftung f&uuml;r die Richtigkeit KI-generierter Empfehlungen.
            </p>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">Affiliate-Hinweis</h2>
            <p>
              VELIQA enth&auml;lt Affiliate-Links zu Boots- und Yachtvermietungsplattformen. Wenn Sie &uuml;ber
              diese Links eine Buchung vornehmen, erhalten wir m&ouml;glicherweise eine Provision. Dies hat
              keinen Einfluss auf die Reihenfolge oder Auswahl der angezeigten Ergebnisse. Alle Affiliate-Links
              sind entsprechend gekennzeichnet.
            </p>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">Urheberrecht</h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
              deutschen Urheberrecht. Bootsbilder und -beschreibungen stammen von den jeweiligen
              Vermietungsplattformen und unterliegen deren Urheberrecht.
            </p>
          </section>

          <section>
            <h2 className="text-xl text-white font-medium mt-8 mb-3">Streitschlichtung</h2>
            <p>
              Die Europ&auml;ische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-light hover:text-gold underline"
              >
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <div className="mt-10 pt-6 border-t border-white/[0.06]">
            <Link href="/datenschutz" className="text-gold-light hover:text-gold underline text-sm">
              &rarr; Datenschutzerkl&auml;rung
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
