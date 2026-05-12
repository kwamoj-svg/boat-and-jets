const API_KEY = () => process.env.GOOGLE_PLACES_API_KEY || "";

export interface MarinaNearby {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  place_id: string;
}

export interface LocationInfo {
  lat: number;
  lng: number;
  formatted_address: string;
  marinas: MarinaNearby[];
}

export async function resolveLocation(query: string): Promise<LocationInfo | null> {
  const key = API_KEY();
  if (!key) return null;

  try {
    const geocodeRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`
    );
    if (!geocodeRes.ok) return null;
    const geocodeData = await geocodeRes.json();

    const result = geocodeData.results?.[0];
    if (!result) return null;

    const { lat, lng } = result.geometry.location;
    const formatted_address = result.formatted_address;

    const marinas = await findMarinas(lat, lng, key);

    return { lat, lng, formatted_address, marinas };
  } catch {
    return null;
  }
}

async function findMarinas(lat: number, lng: number, key: string): Promise<MarinaNearby[]> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=30000&type=point_of_interest&keyword=marina+yacht+harbor+boat+rental&key=${key}`
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results ?? []).slice(0, 8).map((p: {
      name: string;
      vicinity: string;
      geometry: { location: { lat: number; lng: number } };
      rating?: number;
      place_id: string;
    }) => ({
      name: p.name,
      address: p.vicinity,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      rating: p.rating,
      place_id: p.place_id,
    }));
  } catch {
    return [];
  }
}

export function marinasToSearchContext(marinas: MarinaNearby[]): string {
  if (marinas.length === 0) return "";
  return marinas.map(m => m.name).join(", ");
}
