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
    // Step 1: Text Search (New) to find the location
    const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.location,places.formattedAddress,places.displayName",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 1,
      }),
    });

    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const place = searchData.places?.[0];
    if (!place?.location) return null;

    const lat = place.location.latitude;
    const lng = place.location.longitude;
    const formatted_address = place.formattedAddress || query;

    // Step 2: Nearby Search (New) for marinas
    const marinas = await findMarinas(lat, lng, key);

    return { lat, lng, formatted_address, marinas };
  } catch {
    return null;
  }
}

async function findMarinas(lat: number, lng: number, key: string): Promise<MarinaNearby[]> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.rating,places.id",
      },
      body: JSON.stringify({
        includedTypes: ["marina", "boat_rental", "yacht_club"],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 30000.0,
          },
        },
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.places ?? []).slice(0, 8).map((p: {
      displayName?: { text: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
      rating?: number;
      id?: string;
    }) => ({
      name: p.displayName?.text || "",
      address: p.formattedAddress || "",
      lat: p.location?.latitude || 0,
      lng: p.location?.longitude || 0,
      rating: p.rating,
      place_id: p.id || "",
    }));
  } catch {
    return [];
  }
}

export function marinasToSearchContext(marinas: MarinaNearby[]): string {
  if (marinas.length === 0) return "";
  return marinas.map(m => m.name).join(", ");
}
