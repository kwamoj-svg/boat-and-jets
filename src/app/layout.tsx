import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ConciergeBubble from "@/components/ConciergeBubble";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://veliqa.life"),
  title: {
    default: "VELIQA — AI-Powered Yacht Discovery",
    template: "%s · VELIQA",
  },
  description:
    "Suche und chartere Yachten, Segelboote, Katamarane und Motorboote weltweit. KI-gestützt, über 5.000 Boote, transparente Preise.",
  keywords: [
    "yacht", "yacht charter", "boat rental", "boat charter", "sailing",
    "catamaran", "motoryacht", "luxury yacht", "Mediterranean",
    "Croatia", "Greece", "Spain", "Italy", "Caribbean",
    "Segelboot mieten", "Katamaran chartern", "Yacht kaufen",
    "AI search", "VELIQA",
  ],
  authors: [{ name: "VELIQA" }],
  creator: "VELIQA",
  publisher: "VELIQA",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "VELIQA",
    title: "VELIQA — AI-Powered Yacht Discovery",
    description:
      "Suche und chartere Yachten weltweit — KI-gestützt, 5.000+ Boote.",
    url: "https://veliqa.life",
    locale: "de_DE",
  },
  twitter: {
    card: "summary_large_image",
    title: "VELIQA — AI-Powered Yacht Discovery",
    description:
      "Suche und chartere Yachten weltweit — KI-gestützt, 5.000+ Boote.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {children}
          <ConciergeBubble />
        </LanguageProvider>
      </body>
    </html>
  );
}
