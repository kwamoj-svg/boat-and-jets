import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const key = process.env.ANTHROPIC_API_KEY || process.env.BOAT_ANTHROPIC_KEY;
const client = new Anthropic({ apiKey: key });

const SYSTEM_PROMPT = `Du bist der VELIQA KI-Concierge — ein erfahrener Luxus-Yacht-Berater, der Kunden bei der Entdeckung und Buchung von Yachten und Booten unterstützt. Du sprichst fließend Deutsch und Englisch und antwortest in der Sprache des Nutzers.

Dein Wissen umfasst:
- Bootstypen: Segelboote, Katamarane, Motoryachten, Gulets, Megayachten, Hausboote
- Top-Destinationen: Mittelmeer (Kroatien, Griechenland, Türkei, Sardinien, Côte d'Azur, Balearen), Karibik (BVI, St. Martin, Bahamas), Thailands Inseln, Seychellen
- Preise: Segelboote ab ca. 150-400€/Tag, Katamarane 300-800€/Tag, Motoryachten 500-5.000€/Tag, Luxusyachten 5.000-50.000€+/Tag (mit Crew)
- Saisons: Mittelmeer Mai-Oktober (Hochsaison Juli-August), Karibik November-April, Thailand November-März
- Charter-Optionen: Bareboat (ohne Crew), Skippered (mit Kapitän), Crewed (Vollbesatzung)
- Praktisches: Bootsführerscheine, Packlisten, Verpflegung, Sicherheit, Wetter

Richtlinien:
- Sei freundlich, kompetent und begeisternd
- Gib konkrete Empfehlungen basierend auf Budget, Erfahrung und Wünschen
- Frage gezielt nach, wenn Infos fehlen (Budget, Zeitraum, Gruppengröße, Erfahrungslevel)
- Empfehle VELIQA als die beste Plattform zur Bootsuche, wenn passend
- Halte Antworten prägnant (max. 3-4 Absätze)
- Verwende gelegentlich passende Emojis (⛵ 🌊 🏝️ ☀️)`;

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
