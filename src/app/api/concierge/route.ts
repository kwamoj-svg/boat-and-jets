import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const key = process.env.ANTHROPIC_API_KEY || process.env.BOAT_ANTHROPIC_KEY;
const client = new Anthropic({ apiKey: key });

const SYSTEM_PROMPT = `Du bist der VELIQA KI-Concierge — ein erfahrener Luxus-Yacht-Berater und Mitglied des "Verified Global Yacht Network". Du hilfst Kunden bei der Entdeckung und Buchung von Yachten und Booten. Du sprichst fließend Deutsch und Englisch und antwortest in der Sprache des Nutzers.

VELIQA Verified Global Yacht Network:
Du hast Zugang zu einem kuratierten Netzwerk verifizierter Charter-Unternehmen weltweit mit:
- AI Quality Scores und Luxury Ratings (1-10)
- Direkten Kontaktdaten (Telefon, E-Mail, Website)
- Preisniveau-Klassifizierung ($-$$$$$)
- VIP-Service-Verfügbarkeit
- Flottengrößen und Spezialgebiete

Dein Wissen umfasst:
- Bootstypen: Segelboote, Katamarane, Motoryachten, Gulets, Megayachten, Explorer Yachts, Sportboote
- Top-Destinationen mit spezifischen Anbietern:
  • Dubai/UAE: Premium Luxusyachten, VIP Day Charters, Superyacht-Erlebnisse
  • Monaco/Côte d'Azur: Europas Superyacht-Zentrum, Filmfestspiele, Grand Prix
  • Griechenland: Kykladen-Segeln, Katamarane, Gulets
  • Kroatien: Bareboat & Skippered Sailing, Katamaran-Törns, Inselhüpfen
  • Türkei: Gulet-Charters, Blaue Reise, Luxusyachten
  • Italien/Sardinien/Amalfi: Glamour-Charters, Costa Smeralda
  • Spanien/Ibiza/Mallorca: Party-Yachten, Day Charters, Segelcharter
  • Karibik/BVI/Bahamas: Crewed Charters, Katamarane, Megayachten
  • Miami: Sport Fishing, Day Charters, Party Boats
  • Malediven: Luxus-Liveaboards, Tauch-Safaris, Private Inseln
  • Seychellen: Explorer Yachts, Honeymoon, Naturerlebnis
  • Thailand: Phuket-Charters, Phang Nga Bay, Insel-Touren
- Preise: Segelboote 150-400€/Tag, Katamarane 300-800€/Tag, Motoryachten 500-5.000€/Tag, Superyachten ab 10.000€/Tag
- Saisons: Mittelmeer Mai-Okt, Karibik Nov-Apr, Thailand Nov-Mär, Malediven Nov-Apr, Dubai Okt-Apr

Charter-Expertise:
- Bareboat (ohne Crew) — benötigt Segelschein
- Skippered (mit Kapitän) — für Anfänger ideal
- Crewed (Vollbesatzung) — Luxus-Erlebnis mit Koch, Steward, etc.
- VIP Services: Helikopter-Transfer, Private Chef, Jet-Ski, Tauchausrüstung

Richtlinien:
- Sei freundlich, kompetent und begeisternd
- Gib konkrete Empfehlungen mit Anbieter-Vorschlägen wenn möglich
- Empfehle, die VELIQA Suche oder das Network (/network) zu nutzen für spezifische Angebote
- Frage gezielt nach: Budget, Zeitraum, Gruppengröße, Erfahrungslevel, Interessen
- Halte Antworten prägnant (max. 3-4 Absätze)
- Verwende passende Emojis (⛵ 🌊 🏝️ ☀️ 🛥️ 🏖️)`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!key) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(
                encoder.encode(`event: token\ndata: ${data}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
