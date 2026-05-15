import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Charter-Katalog — 24.000+ Yachten weltweit | VELIQA",
  description:
    "Yacht- und Bootscharter weltweit: Mittelmeer, Karibik, Indischer Ozean. Filter nach Bootstyp, Revier, Budget und Gästezahl. Direkte Verlinkung zur Buchung.",
  alternates: { canonical: "https://veliqa.life/charter" },
  openGraph: {
    title: "Charter-Katalog — 24.000+ Yachten weltweit",
    description:
      "Yacht- und Bootscharter weltweit: Mittelmeer, Karibik, Indischer Ozean. KI-gestützt von VELIQA.",
    url: "https://veliqa.life/charter",
    type: "website",
  },
};

export default function CharterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
