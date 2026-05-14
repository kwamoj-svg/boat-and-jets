import type { Locale } from "./i18n/dictionaries";

/**
 * Convert a Boataround detail URL to the appropriate language version.
 *
 * Path patterns observed in their sitemaps:
 *   en → /boat/{slug}
 *   de → /de/boot/{slug}
 *   fr → /fr/bateau/{slug}
 *   es → /es/bote/{slug}
 *   it → /it/barca/{slug}
 *
 * Plus appends affiliate-tracking params if BOATAROUND_AFFILIATE_ID is set.
 */

const LANG_PATH: Record<Locale, { prefix: string; word: string }> = {
  en: { prefix: "", word: "boat" },
  de: { prefix: "/de", word: "boot" },
  fr: { prefix: "/fr", word: "bateau" },
  es: { prefix: "/es", word: "bote" },
  it: { prefix: "/it", word: "barca" },
};

const PATH_REGEX = /^\/(?:(de|fr|es|it)\/)?(boot|boat|bateau|bote|barca)\/([^/]+)/i;

export function localizedBoataroundUrl(
  url: string | null | undefined,
  locale: Locale,
  affiliateId?: string | null
): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }

  if (!/boataround\.com$/i.test(u.hostname.replace("www.", ""))) {
    return url;
  }

  const match = PATH_REGEX.exec(u.pathname);
  if (match) {
    const slug = match[3];
    const lang = LANG_PATH[locale];
    u.pathname = `${lang.prefix}/${lang.word}/${slug}`;
  }

  if (affiliateId) {
    u.searchParams.set("utm_source", "veliqa");
    u.searchParams.set("utm_medium", "affiliate");
    u.searchParams.set("aff", affiliateId);
  }
  return u.toString();
}

/** Public client wrapper — reads NEXT_PUBLIC_BOATAROUND_AFFILIATE_ID if available */
export function localizedBoataroundUrlClient(
  url: string | null | undefined,
  locale: Locale
): string | null {
  const aff =
    typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_BOATAROUND_AFFILIATE_ID || null);
  return localizedBoataroundUrl(url, locale, aff || undefined);
}
