import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ConciergeBubble from "@/components/ConciergeBubble";

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
  title: "VELIQA — AI-Powered Yacht Discovery",
  description:
    "The future of yacht and boat search. Describe your perfect boat experience and let AI find your match across 50+ platforms.",
  keywords: [
    "yacht",
    "boat",
    "charter",
    "luxury",
    "AI",
    "discovery",
    "rental",
  ],
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
        {children}
        <ConciergeBubble />
      </body>
    </html>
  );
}
