import { NextRequest } from "next/server";
import {
  scrapeMasterYachting,
  scrapeBoataround,
  bulkScrapeMasterYachting,
  bulkScrapeBoataround,
  MASTER_YACHTING_DESTINATIONS,
  BOATAROUND_BOAT_TYPES,
} from "@/lib/bulk-scraper";
import { saveBoats } from "@/lib/database";

export const maxDuration = 300; // 5 min for bulk scraping

/**
 * GET /api/scrape?platform=master-yachting&dest=kroatien&pages=3
 * GET /api/scrape?platform=boataround&dest=croatia&pages=2
 * GET /api/scrape?platform=all&pages=2  (bulk scrape all destinations)
 *
 * Streams progress via SSE, saves boats to database.
 */
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") || "all";
  const dest = req.nextUrl.searchParams.get("dest");
  const pages = Math.min(Number(req.nextUrl.searchParams.get("pages")) || 3, 10);
  const save = req.nextUrl.searchParams.get("save") !== "false"; // default: save to DB

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        send("start", {
          platform,
          destination: dest || "all",
          pages,
          save,
          master_yachting_destinations: MASTER_YACHTING_DESTINATIONS,
          boataround_boat_types: BOATAROUND_BOAT_TYPES,
        });

        let totalBoats = 0;
        let totalSaved = 0;

        // ── Master-Yachting ──
        if (platform === "master-yachting" || platform === "all") {
          if (dest) {
            // Single destination
            send("progress", {
              platform: "master-yachting.de",
              destination: dest,
              status: "scraping",
            });
            const boats = await scrapeMasterYachting(dest, pages, pages <= 2);
            totalBoats += boats.length;
            send("progress", {
              platform: "master-yachting.de",
              destination: dest,
              boatsFound: boats.length,
              status: "done",
            });

            if (save && boats.length > 0) {
              await saveBoats(boats);
              totalSaved += boats.length;
              send("saved", {
                platform: "master-yachting.de",
                count: boats.length,
              });
            }

            // Send sample listings
            for (const b of boats.slice(0, 5)) {
              send("sample", {
                name: b.name,
                price: b.price_per_week,
                country: b.country,
                port: b.port,
                url: b.source_url,
                type: b.type,
              });
            }
          } else {
            // Bulk: all destinations
            const boats = await bulkScrapeMasterYachting(
              undefined,
              pages,
              (p) => {
                send("progress", p);
              }
            );
            totalBoats += boats.length;

            if (save && boats.length > 0) {
              // Save in batches of 50
              for (let i = 0; i < boats.length; i += 50) {
                const batch = boats.slice(i, i + 50);
                await saveBoats(batch);
                totalSaved += batch.length;
                send("saved", {
                  platform: "master-yachting.de",
                  batch: Math.floor(i / 50) + 1,
                  count: batch.length,
                  totalSaved,
                });
              }
            }
          }
        }

        // ── Boataround ──
        if (platform === "boataround" || platform === "all") {
          if (dest) {
            // dest = boat type for boataround (sailing, motor, catamaran)
            send("progress", {
              platform: "boataround.com",
              destination: dest,
              status: "scraping",
            });
            const boats = await scrapeBoataround(dest, pages, 200);
            totalBoats += boats.length;
            send("progress", {
              platform: "boataround.com",
              destination: dest,
              boatsFound: boats.length,
              status: "done",
            });

            if (save && boats.length > 0) {
              await saveBoats(boats);
              totalSaved += boats.length;
              send("saved", {
                platform: "boataround.com",
                count: boats.length,
              });
            }

            for (const b of boats.slice(0, 5)) {
              send("sample", {
                name: b.name,
                price: b.price_per_week,
                country: b.country,
                url: b.source_url,
                type: b.type,
              });
            }
          } else {
            const boats = await bulkScrapeBoataround(
              undefined,
              pages,
              (p) => {
                send("progress", p);
              }
            );
            totalBoats += boats.length;

            if (save && boats.length > 0) {
              for (let i = 0; i < boats.length; i += 50) {
                const batch = boats.slice(i, i + 50);
                await saveBoats(batch);
                totalSaved += batch.length;
                send("saved", {
                  platform: "boataround.com",
                  batch: Math.floor(i / 50) + 1,
                  count: batch.length,
                  totalSaved,
                });
              }
            }
          }
        }

        send("done", {
          totalBoats,
          totalSaved,
          platform,
          destination: dest || "all",
        });
      } catch (error) {
        console.error("[Scraper API] Error:", error);
        send("error", {
          error: error instanceof Error ? error.message : "Scrape failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
