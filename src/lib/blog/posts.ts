/**
 * Blog post data. Hand-curated SEO content for veliqa.life.
 * To add more posts: append entries to BLOG_POSTS. Each slug must be unique.
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  category: "Charter" | "Kauf" | "Reiseziele" | "Ratgeber" | "Boot-Typen";
  publishedAt: string;
  readingTimeMin: number;
  cover?: string;
  content: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "yacht-chartern-kroatien-revier-guide",
    title: "Yacht chartern Kroatien — Reviere, Häfen und Saisonzeiten",
    description:
      "Kroatien ist Europas Yacht-Hotspot Nummer eins. Hier siehst du, welches Revier zu welchem Crew-Typ passt, was eine Woche kostet und wann du wirklich segeln solltest.",
    keywords: [
      "Yacht chartern Kroatien",
      "Bareboat Kroatien",
      "Segelyacht mieten Adria",
      "Charter Kornaten",
      "Yacht Split",
      "Beste Reisezeit Kroatien Segeln",
    ],
    category: "Charter",
    publishedAt: "2025-08-12",
    readingTimeMin: 8,
    cover:
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80",
    content: `Kroatien ist das meistgebuchte Charter-Revier Europas — über 4.000 Yachten liegen zwischen Pula und Dubrovnik. Wer das erste Mal hier segelt, wird von der Inseldichte erschlagen.

## Die vier wichtigsten Reviere

### Istrien — der ruhige Norden

Von Pula oder Rovinj erreichst du in einem Tagestörn die Brijuni-Inseln. Marinas wie ACI Pomer und ACI Rovinj sind technisch erstklassig, aber teurer als der Süden.

### Kvarner-Bucht — Crew-freundlich und kompakt

Ausgangshafen Punat auf Krk. Tagesetappen von 15-25 sm, viele geschützte Buchten. Ideal für gemischte Crews mit Skipper-Anfängern.

### Mitteldalmatien — der Klassiker

Split und Trogir sind die Charter-Drehscheiben. Über 70 Prozent aller Charteryachten Kroatiens liegen in diesem Korridor. Im [Charter-Katalog](/charter) findest du allein um Split mehrere tausend Yachten.

### Süddalmatien — Mljet, Korčula, Dubrovnik

Wildere Küste, weniger Marinas, mehr Naturhäfen. Eine Lagoon 42 kostet hier in der Hauptsaison 5.500-7.500 Euro pro Woche bareboat.

## Was kostet eine Woche

- Einsteiger-Sailboat (Bavaria 34, älter als 2015): ab 1.400 Euro/Woche Nebensaison
- Standard-Familienyacht (Sun Odyssey 410, Baujahr 2020+): 3.500-5.500 Euro
- Premium-Katamaran (Lagoon 46, neu): 9.000-14.000 Euro in der Hauptsaison
- Mit Skipper: zusätzlich 180-220 Euro pro Tag

Zwischen Mai und Mitte Juni sowie ab Mitte September bekommst du dieselbe Yacht für 30-40 Prozent weniger.

## Beste Reisezeit, ehrlich

- Mai: 22 Grad Wasser, leerer als August, gelegentlich Bora
- Juni: ideal, 25 Grad, stabile Maestral-Winde
- Juli/August: überfüllt, teuer
- September: Lieblingsmonat vieler Profis, warmes Wasser, leere Häfen
- Oktober: ruhiger, kühlere Abende, günstige Preise

## Fazit

Wer zum ersten Mal im Mittelmeer chartert, ist in Mitteldalmatien aus Split richtig. Speichere passende Boote im [CRM](/crm) und vergleiche sie nebeneinander.`,
  },
  {
    slug: "katamaran-mieten-mallorca-kosten",
    title: "Katamaran mieten Mallorca — Was eine Woche wirklich kostet",
    description:
      "Lagoon, Bali, Fountaine Pajot — die Balearen sind voller Katamarane. Echte Wochenpreise, wichtige Häfen und was Charter-Anbieter dir gern verschweigen.",
    keywords: [
      "Katamaran mieten Mallorca",
      "Katamaran Charter Balearen",
      "Lagoon 42 Mallorca",
      "Bali 4.6 Charter",
      "Palma Charter",
    ],
    category: "Charter",
    publishedAt: "2025-09-03",
    readingTimeMin: 7,
    cover:
      "https://images.unsplash.com/photo-1542367592-8849eb950fd8?auto=format&fit=crop&w=1600&q=80",
    content: `Auf Mallorca liegen knapp 200 Katamarane für Bareboat- und Skipper-Charter. Die Preisspanne in der Hauptsaison ist enorm — von 4.500 bis 22.000 Euro pro Woche.

## Marktüberblick Sommer 2025

In der ersten Augustwoche zahlst du:

- Lagoon 40, Baujahr 2018: 7.500-9.000 Euro
- Bali 4.4, Baujahr 2022: 10.500-13.000 Euro
- Lagoon 46, Baujahr 2023+: 13.500-17.000 Euro
- Fountaine Pajot Saona 47: 14.000-18.500 Euro

Im Juni oder September fallen diese Preise um 35-45 Prozent.

## Was zum Preis dazukommt

1. Endreinigung: 350-650 Euro
2. Skipper: 200-260 Euro pro Tag plus Verpflegung
3. Hostess: 180-220 Euro pro Tag
4. Diesel und Außenbord-Benzin: nach Verbrauch
5. Marina-Liegegebühren: 80-180 Euro pro Nacht
6. Kaution: 4.000-8.000 Euro per Kreditkarte oder Versicherung

## Ausgangshäfen

### Palma

Größtes Angebot, schnellster Flughafentransfer. Liegegebühren sind allerdings die teuersten der Insel.

### Port d'Andratx

Westmallorca, näher zu Ibiza und Formentera. Wer Richtung Cabrera will, startet hier besser.

### Alcudia

Norden, ideal für Menorca-Törns. Weniger Charter-Angebot, ruhigere Übernahme.

## Die typische 7-Tage-Route

Palma → Cala Pi → Cabrera → Es Trenc → Ibiza → Formentera → Andratx → Palma. Etwa 180 Seemeilen.

## Worauf achten beim Buchen

- Aktuelle Bewertungen prüfen, nicht nur Sterne
- Baujahr und letztes Refit explizit fragen
- Klimaanlage und Generator-Leistung: Im August Pflicht
- Wassermacher-Kapazität: Bei fünf Doppelkabinen schnell knapp
- Dinghy mit mindestens 15 PS

[Im VELIQA-Katalog](/charter) filterst du gezielt nach Katamaranen auf den Balearen.

## Fazit

Mallorca ist teurer als Kroatien, aber landschaftlich vielfältiger. Die ersten zwei Septemberwochen sind preislich oft halb so teuer wie August bei besserem Wetter.`,
  },
  {
    slug: "bareboat-vs-skipper-charter",
    title: "Bareboat oder Skipper? Welcher Charter zu dir passt",
    description:
      "Zwischen Bareboat-Charter mit eigenem Schein und Skipper-Charter liegen vier Welten — Kosten, Verantwortung, Lerneffekt. Hier die ehrliche Entscheidungshilfe.",
    keywords: [
      "Bareboat Charter",
      "Skipper Charter",
      "Yacht mit Skipper mieten",
      "SBF See SKS",
      "Charter Schein",
    ],
    category: "Charter",
    publishedAt: "2025-07-21",
    readingTimeMin: 6,
    content: `Du willst eine Woche an Bord — aber selbst steuern oder den Profi mitnehmen? Diese Entscheidung kostet schnell 1.500 Euro Differenz.

## Bareboat — die Maximalfreiheit

Beim Bareboat mietest du das Boot ohne Crew. Der Anbieter prüft deinen Schein — in Kroatien reicht meist SBF See plus UKW-SRC, viele Vermieter wollen zusätzlich SKS sehen.

Vorteile:

- Komplette Routen-Freiheit
- Kein zusätzliches Crewmitglied an Bord
- Deutlich günstiger
- Du lernst und wächst mit jedem Törn

Nachteile:

- Du trägst Verantwortung 24/7
- Bei Schäden volle Haftung bis zur Kaution
- Crew kann nicht "abschalten"

## Skipper-Charter — Urlaub statt Verantwortung

Der Skipper kommt mit, navigiert, schließt an, fährt aus dem Hafen.

Vorteile:

- Echter Urlaub, keine Sorgen
- Skipper kennt Geheimtipps und kürzere Wege
- Sicherheit bei Wetterumschwung
- Du lernst nebenbei mehr als bei einem SKS-Kurs

Nachteile:

- 1.400-1.800 Euro Aufpreis pro Woche
- Eine Koje weniger oder Skipper-Kabine
- Skipper-Bordkasse für Verpflegung üblich

## Wann welche Variante

### Wähle Bareboat wenn

- Du SKS plus Erfahrung hast
- Dein Team aus erfahrenen Seglern besteht
- Du Routen flexibel ändern willst
- Budget eng ist

### Wähle Skipper wenn

- Erste Yacht-Charter im Leben
- Crew aus Nicht-Seglern und Kindern
- Unbekanntes oder anspruchsvolles Revier
- Du echten Urlaub willst

## Die Mittelvariante: Mit-Skipper

In Kroatien zunehmend beliebt: ein Skipper kommt für ein bis zwei Tage mit, übergibt dir dann die Yacht. Kosten: 350-500 Euro.

## Fazit

Beim ersten Mal einen Skipper buchen — der Lerneffekt für die nächste Saison ist enorm. Geübte fahren mit Bareboat günstiger. Beide Modelle findest du in der [VELIQA-Suche](/).`,
  },
  {
    slug: "yacht-kaufen-checkliste",
    title: "Yacht kaufen — 21-Punkte-Checkliste vor dem Vertrag",
    description:
      "Vor dem Yachtkauf gibt es 21 Dinge, die du prüfen solltest. Manche kosten dich später fünf-, andere sechsstellige Beträge.",
    keywords: [
      "Yacht kaufen",
      "Yacht kaufen Checkliste",
      "Gebrauchte Yacht Probefahrt",
      "Boot kaufen Worauf achten",
      "Yacht Survey",
    ],
    category: "Kauf",
    publishedAt: "2025-06-04",
    readingTimeMin: 9,
    cover:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1600&q=80",
    content: `Yachtkauf ist die zweitteuerste Anschaffung im Leben vieler Eigner. Wer hier flüchtig prüft, zahlt jahrelang nach.

## Vor der ersten Besichtigung

1. Eigentumsverhältnisse klären — Schiffsregister-Auszug verlangen.
2. MwSt-Status — In der EU verkehrsfähig nur mit Beleg.
3. Flagge und Register — Wechsel dauert 3-12 Monate und kostet 2.000-8.000 Euro.

## Beim Besichtigungs-Termin

4. Rumpfdurchsicht außen — Risse, Osmose-Blasen, Kiel-Anbindung.
5. Deck und Beschläge — Wackelnde Beschläge bedeuten oft Feuchteschaden.
6. Mast und Stehendes Gut — Bei Booten älter als 10 Jahre Pflicht: Surveyor.
7. Motor-Stunden plausibel? Ab 4.000 Stunden große Überholung fällig.
8. Tanks — Edelstahltanks älter als 25 Jahre sind oft korrodiert.
9. Segel — Alle 8-12 Jahre Neukauf, 4.000-12.000 Euro.

## Technik genauer prüfen

10. Elektrik, Batteriebänke, Generator-Stunden.
11. Bilge — Ölspuren? Trockenheit?
12. Toiletten und Plumbing — Geruch im Vorschiff oft erstes Zeichen.
13. Klimaanlage und Heizung — Funktioniert? Wartungshistorie?
14. Saildrive-Schmierung, Seewasserkühler.

## Vertragsphase

15. Survey beauftragen — 1.500-3.500 Euro, lohnt sich immer ab 50.000 Euro.
16. Probefahrt unter Segel UND Motor.
17. Bilge-Test während Fahrt.
18. Kaufvertrag in Schriftform mit Inventar und Mängelliste.
19. Anzahlung über Treuhand. Niemals direkt auf Verkäuferkonto.
20. Liegeplatz vor Kauf sichern. In vielen Marinas Wartezeiten 1-3 Jahre.
21. Versicherung-Angebot vergleichen.

## Was kostet eine 12-Meter-Yacht pro Jahr

Eine Bavaria 41 für 150.000 Euro Kaufpreis:

- Liegeplatz Mittelmeer: 4.000-8.000 Euro
- Versicherung: 1.200-2.000 Euro
- Winterlager und Service: 2.000-4.000 Euro
- Antifouling, Polierungen: 800-1.500 Euro
- Reparatur-Rücklage: 5 Prozent vom Wert = 7.500 Euro

Realistisch: 15.000-25.000 Euro Unterhalt pro Jahr.

## Fazit

Wer dieser Liste folgt, vermeidet 80 Prozent der typischen Käufer-Fehler. Im [Bootkauf-Bereich](/sale) findest du aktuelle Listings.`,
  },
  {
    slug: "beste-reisezeit-mittelmeer-yachtcharter",
    title: "Beste Reisezeit für Yachtcharter im Mittelmeer",
    description:
      "Monat für Monat durch die Mittelmeer-Charter-Saison: wo es im Mai schon warm ist, warum August oft die schlechteste Zeit ist und wo September Profis hinfahren.",
    keywords: [
      "Beste Reisezeit Mittelmeer",
      "Yacht Mittelmeer Saison",
      "Charter Nebensaison",
      "Yacht September",
    ],
    category: "Reiseziele",
    publishedAt: "2025-03-18",
    readingTimeMin: 6,
    cover:
      "https://images.unsplash.com/photo-1473221326025-9183b464bb7e?auto=format&fit=crop&w=1600&q=80",
    content: `Das Mittelmeer hat keine "eine" Charter-Saison. Westliches Mittelmeer, Adria, Ägäis und Türkei verhalten sich völlig unterschiedlich.

## März und April

Frühe Saison, viele Marinas noch im Winterbetrieb. Türkei ab Ostern fahrbar, Wassertemperatur 17-19 Grad. Charterpreise auf Jahrestief.

## Mai

Der Geheim-Monat in Kroatien. 22 Grad Wasser ab Mitte Mai, Häfen leer. Vorsicht: Bora kann noch zuschlagen.

## Juni

Beste Bedingungen fast überall. Preise 20-30 Prozent unter Hochsaison. Wenn du die Wahl hast, buche im Juni.

## Juli

Hauptsaison startet. Familien-Reisezeit, Preise springen hoch. Meltemi in den Kykladen kräftig.

## August

Der überschätzte Monat. Höchste Preise, vollste Häfen, in der Türkei oft 35 Grad. Wer kann, vermeidet August.

## September

Erste Hälfte: noch warm, leerer als Juli, Wassertemperatur Spitze. Profi-Crew-Lieblingsmonat.

## Oktober

Späte Saison. Türkische Südküste oft noch 25 Grad. Charter-Preise 50-60 Prozent unter Hochsaison.

## November bis Februar

Charter ruht im Mittelmeer. Wer im Winter ans Wasser will: Karibik, Florida, Thailand.

## Praxis-Empfehlungen

- Familie mit Schulkindern: Juli/August — frühestmöglich buchen
- Erwachsenen-Crew: Juni oder Mitte September — beste Preis-Leistung
- Anfänger: Mai oder Juni — ruhige Winde
- Distanzsegeln: April-Mai oder Oktober

## Fazit

Wer flexibel ist, sollte den Juni oder die zweite Septemberhälfte ins Visier nehmen. [Im Charter-Katalog](/charter) siehst du Verfügbarkeiten direkt mit Saisonpreisen.`,
  },
  {
    slug: "lagoon-vs-bali-vs-fountaine-katamaran",
    title: "Lagoon vs Bali vs Fountaine Pajot — Welcher Katamaran für wen",
    description:
      "Drei Werften dominieren den Katamaran-Markt — und sie unterscheiden sich mehr, als die Hochglanzbroschüren verraten. Der ehrliche Direktvergleich.",
    keywords: [
      "Lagoon Katamaran",
      "Bali Katamaran",
      "Fountaine Pajot",
      "Katamaran Vergleich",
      "Bester Charter Katamaran",
    ],
    category: "Boot-Typen",
    publishedAt: "2025-04-29",
    readingTimeMin: 7,
    cover:
      "https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?auto=format&fit=crop&w=1600&q=80",
    content: `Lagoon, Bali und Fountaine Pajot sind die drei großen Hersteller im Charter-Katamaran-Segment. Auf den ersten Blick ähnlich, auf den zweiten erheblich unterschiedlich.

## Lagoon — der Charter-Klassiker

Lagoon 40, 42, 46 und 52 sind die Verkaufsschlager.

Stärken:

- Erprobte Konstruktion seit 30 Jahren
- Hohes Volumen, geräumige Eigner-Versionen
- Wiederverkaufswert stabil

Schwächen:

- Weniger Segeleigenschaften am Wind
- In der Eigner-Version teurer als vergleichbare Bali

Charter-Preis Lagoon 46 in Kroatien, Juli: 12.000-15.000 Euro/Woche.

## Bali — der Allrounder mit Innovationen

Bali revolutionierte das Cockpit-Konzept mit schiebbarer Glasfront. Bali 4.4, 4.6 und 4.8 sind meistgebucht.

Stärken:

- Innovativ in Innenraum-Layout
- Großer Vor-Kojen-Bereich mit Sundeck
- Solide Bauweise

Schwächen:

- Schwerer als Lagoon vergleichbarer Größe
- Designkonzept polarisiert

Charter-Preis Bali 4.6 in Mallorca, August: 13.500-16.000 Euro/Woche.

## Fountaine Pajot — die Segler-Wahl

Französische Werft mit Fokus auf Segeleigenschaften. Saona 47, Astrea 42, Elba 45.

Stärken:

- Beste Segeleigenschaften am Wind
- Hochwertigere Innenausstattung
- Eigner-Layouts sehr durchdacht

Schwächen:

- Etwas weniger Volumen pro Meter
- Charter-Verfügbarkeit geringer
- Preislich oft über Lagoon

Charter-Preis Astrea 42 in Griechenland, September: 9.500-11.500 Euro/Woche.

## Welcher Kat für welche Crew

### Für Charter-Anfänger und Familien

Lagoon. Hohe Verfügbarkeit, vorhersehbares Verhalten. Lagoon 40 oder 42 ist der gemeinsame Nenner.

### Für Gruppen mit hohem Komfortanspruch

Bali. Wer Salon und Cockpit als einen Raum nutzen will.

### Für Segel-Enthusiasten

Fountaine Pajot. Wer Segeln will, nicht nur Motoryacht-mit-zwei-Rümpfen.

## Was beim Charter-Buchen zu beachten

- Baujahr ist entscheidender als das Modell
- Eigner-Version (3 Doppelkabinen) vs Charter-Version (4 + Skipperkabine)
- Generator und Klimaanlage in jeder Kabine im August Pflicht
- Solarpanel: mindestens 800W bei intensivem Wassersport-Verbrauch

## Fazit

Lagoon ist sicher, Bali ist gemütlich, Fountaine Pajot ist sportlich. Alle drei ausgereift. Filtere im [Charter-Katalog](/charter) nach Werft und Baujahr.`,
  },
];
