import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bootkauf — Yachten neu & gebraucht weltweit | VELIQA",
  description:
    "Yachten und Boote zum Verkauf: Lagoon, Bali, Princess, Sunseeker, Beneteau und mehr. Aggregiert aus TheYachtMarket, Scanboat und Marktplätzen weltweit.",
  alternates: { canonical: "https://veliqa.life/sale" },
  openGraph: {
    title: "Bootkauf — Yachten neu & gebraucht",
    description:
      "Yachten und Boote zum Verkauf weltweit. Aggregiert von VELIQA.",
    url: "https://veliqa.life/sale",
    type: "website",
  },
};

export default function SaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
