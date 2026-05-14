/**
 * Type-based fallback images for boat listings that don't have their own
 * photos (e.g. Samboat sitemap entries don't carry images).
 *
 * All images are public-domain / royalty-free Unsplash photos.
 */

const FALLBACK_IMAGES: Record<string, string[]> = {
  sailing: [
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1534854638093-bada1813ca19?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=800&h=500&fit=crop",
  ],
  sailboat: [
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1534854638093-bada1813ca19?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=800&h=500&fit=crop",
  ],
  catamaran: [
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=800&h=500&fit=crop",
  ],
  motor: [
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1565060169187-5284a3a72b07?w=800&h=500&fit=crop",
  ],
  motorboat: [
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1565060169187-5284a3a72b07?w=800&h=500&fit=crop",
  ],
  speedboat: [
    "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&h=500&fit=crop",
  ],
  yacht: [
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&h=500&fit=crop",
  ],
  superyacht: [
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=800&h=500&fit=crop",
  ],
  gulet: [
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
  ],
  houseboat: [
    "https://images.unsplash.com/photo-1565060169187-5284a3a72b07?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop",
  ],
  jet_ski: [
    "https://images.unsplash.com/photo-1599661046827-dacde6976549?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&h=500&fit=crop",
  ],
  default: [
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&h=500&fit=crop",
  ],
};

/** Deterministic fallback image picker — same boat → same image. */
export function getFallbackBoatImage(type: string | null | undefined, seed?: string | null): string {
  const key = (type || "default").toLowerCase().replace(/[\s-]/g, "_");
  const pool = FALLBACK_IMAGES[key] || FALLBACK_IMAGES.default;
  // Hash the seed (boat name/slug) into a stable index
  let h = 0;
  const s = seed || "x";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}
