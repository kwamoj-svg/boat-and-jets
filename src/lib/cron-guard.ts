import { NextResponse } from "next/server";

/**
 * Returns a 200 no-op response if AUTO_SCRAPE_DISABLED is set in env.
 *
 * Used to silence all `/api/cron/*` routes while the Render-dashboard cron
 * jobs are still scheduled. Lets the user disable scraping by setting one
 * env var instead of deleting each cron job individually. Manual triggers
 * (curl with the secret) still work — we only short-circuit when the kill
 * switch is on AND no `force=1` query param is present.
 */
export function checkCronKillSwitch(searchParams: URLSearchParams): NextResponse | null {
  const disabled = process.env.AUTO_SCRAPE_DISABLED === "1" || process.env.AUTO_SCRAPE_DISABLED === "true";
  if (!disabled) return null;
  if (searchParams.get("force") === "1") return null;
  return NextResponse.json({
    ok: true,
    skipped: true,
    reason: "AUTO_SCRAPE_DISABLED is set — pass &force=1 to override for a manual run.",
  });
}
