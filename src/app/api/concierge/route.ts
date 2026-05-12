import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const key = process.env.ANTHROPIC_API_KEY || process.env.BOAT_ANTHROPIC_KEY;
const client = new Anthropic({ apiKey: key });

function getDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const k = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !k) return null;
  return createClient(url, k);
}

/** Look up relevant network partners based on user's latest message */
async function lookupNetworkPartners(userMessage: string): Promise<string> {
  const db = getDb();
  if (!db) return "";

  // Extract keywords for search
  const keywords = userMessage.toLowerCase();
  const regions = [
    "dubai", "monaco", "greece", "croatia", "turkey", "italy", "spain",
    "ibiza", "mallorca", "sardinia", "miami", "caribbean", "maldives",
    "seychelles", "thailand", "france", "french_riviera", "bahamas",
    "amalfi", "montenegro",
  ];
  const matchedRegion = regions.find(r => keywords.includes(r));

  if (!matchedRegion) return "";

  try {
    const { data } = await db
      .from("yacht_network")
      .select("company_name, country, city, marina, website, phone, email, categories, luxury_score, ai_quality_score, price_level, vip_friendly, fleet_size, description, languages")
      .contains("operating_regions", [matchedRegion])
      .eq("verified", true)
      .order("ai_quality_score", { ascending: false })
      .limit(5);

    if (!data || data.length === 0) return "";

    const partnerInfo = data.map((p: Record<string, unknown>) =>
      `• ${p.company_name} (${p.city || p.country}) — Luxury: ${p.luxury_score}/10, AI: ${p.ai_quality_score}/10, ${p.price_level} | ${(p.categories as string[])?.slice(0, 3).join(", ")} | ${p.vip_friendly ? "VIP" : ""} | ${p.phone || p.email || p.website}`
    ).join("\n");

    return `\n\nVELIQA NETWORK — Top verifizierte Partner in ${matchedRegion}:\n${partnerInfo}\n\nNutze diese Daten um dem Nutzer konkrete Empfehlungen zu geben. Verweise auf das VELIQA Network (/network) für mehr Details.`;
  } catch {
    return "";
  }
}

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

    // Look up relevant network partners for the latest user message
    const lastUserMsg = messages.filter(m => m.role === "user").pop();
    const networkContext = lastUserMsg
      ? await lookupNetworkPartners(lastUserMsg.content)
      : "";

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT + networkContext,
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
