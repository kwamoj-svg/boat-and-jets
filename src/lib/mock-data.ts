import type { Boat, Listing, Recommendation } from "@/types";

const BOAT_IMAGES = [
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80",
  "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80",
  "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80",
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
  "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&q=80",
  "https://images.unsplash.com/photo-1559190394-df5a28aab5c5?w=800&q=80",
  "https://images.unsplash.com/photo-1575362483925-5b3c5a9c5c2d?w=800&q=80",
  "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&q=80",
];

export const mockBoats: Boat[] = [
  {
    id: "b1",
    name: "Azimut Grande",
    type: "motor",
    brand: "Azimut",
    model: "Grande 35 Metri",
    year: 2023,
    length_ft: 115,
    cabins: 5,
    guests: 10,
    crew: 5,
    images: [BOAT_IMAGES[0], BOAT_IMAGES[1]],
    features: ["Jacuzzi", "Stabilizers", "Tender garage", "Beach club", "Sun deck"],
    description: "An extraordinary motor yacht combining Italian elegance with cutting-edge technology.",
  },
  {
    id: "b2",
    name: "Lagoon Seventy 7",
    type: "catamaran",
    brand: "Lagoon",
    model: "Seventy 7",
    year: 2022,
    length_ft: 77,
    cabins: 4,
    guests: 8,
    crew: 3,
    images: [BOAT_IMAGES[2], BOAT_IMAGES[3]],
    features: ["Flybridge", "Spacious saloon", "Electric winches", "Watermaker"],
    description: "A luxury power catamaran offering unmatched space and stability for cruising.",
  },
  {
    id: "b3",
    name: "Oyster 885",
    type: "sailing",
    brand: "Oyster",
    model: "885",
    year: 2021,
    length_ft: 88,
    cabins: 4,
    guests: 8,
    crew: 3,
    images: [BOAT_IMAGES[4], BOAT_IMAGES[5]],
    features: ["Carbon mast", "Teak decks", "Hydraulic passerelle", "Dive compressor"],
    description: "World-class bluewater sailing yacht built for ocean passages in supreme comfort.",
  },
  {
    id: "b4",
    name: "Riva 88 Folgore",
    type: "speedboat",
    brand: "Riva",
    model: "88 Folgore",
    year: 2024,
    length_ft: 88,
    cabins: 4,
    guests: 8,
    crew: 3,
    images: [BOAT_IMAGES[6], BOAT_IMAGES[7]],
    features: ["Hard top", "V-drive propulsion", "Premium audio", "Swim platform"],
    description: "A masterpiece of Italian design — Riva at its finest with breathtaking performance.",
  },
  {
    id: "b5",
    name: "Benetti Oasis",
    type: "superyacht",
    brand: "Benetti",
    model: "Oasis 40M",
    year: 2023,
    length_ft: 131,
    cabins: 5,
    guests: 12,
    crew: 7,
    images: [BOAT_IMAGES[0], BOAT_IMAGES[3]],
    features: ["Infinity pool", "Cinema", "Helipad", "Beach club", "Spa", "Gym"],
    description: "A revolutionary superyacht concept with multiple outdoor living areas and an oasis deck.",
  },
  {
    id: "b6",
    name: "Gulet Perla",
    type: "gulet",
    brand: "Custom",
    model: "Traditional Gulet",
    year: 2019,
    length_ft: 98,
    cabins: 6,
    guests: 12,
    crew: 5,
    images: [BOAT_IMAGES[2], BOAT_IMAGES[5]],
    features: ["Traditional woodwork", "Large aft deck", "Water toys", "BBQ area"],
    description: "An authentic Turkish gulet with modern amenities, perfect for exploring the turquoise coast.",
  },
];

export const mockListings: Listing[] = [
  {
    id: "l1", boat_id: "b1", boat: mockBoats[0], listing_type: "charter",
    price_per_week: 95000, price_per_day: 15000, currency: "EUR",
    region: "Mediterranean", country: "Croatia", port: "Split",
    available_from: "2026-06-01", available_to: "2026-09-30",
    provider: "Adriatic Luxury Charters", provider_url: "#",
    luxury_level: 5, is_featured: true, is_sponsored: false,
    created_at: "2026-01-15", updated_at: "2026-05-01",
  },
  {
    id: "l2", boat_id: "b2", boat: mockBoats[1], listing_type: "charter",
    price_per_week: 42000, price_per_day: 7000, currency: "EUR",
    region: "Mediterranean", country: "Greece", port: "Athens",
    available_from: "2026-05-01", available_to: "2026-10-31",
    provider: "Hellenic Yachting", provider_url: "#",
    luxury_level: 4, is_featured: false, is_sponsored: false,
    created_at: "2026-02-10", updated_at: "2026-04-20",
  },
  {
    id: "l3", boat_id: "b3", boat: mockBoats[2], listing_type: "charter",
    price_per_week: 55000, price_per_day: 9000, currency: "EUR",
    region: "Mediterranean", country: "Greece", port: "Mykonos",
    available_from: "2026-06-01", available_to: "2026-09-30",
    provider: "Aegean Sails", provider_url: "#",
    luxury_level: 4, is_featured: true, is_sponsored: false,
    created_at: "2026-01-20", updated_at: "2026-05-05",
  },
  {
    id: "l4", boat_id: "b4", boat: mockBoats[3], listing_type: "charter",
    price_per_week: 75000, price_per_day: 12000, currency: "EUR",
    region: "Mediterranean", country: "France", port: "Monaco",
    available_from: "2026-06-15", available_to: "2026-09-15",
    provider: "Riviera Elite", provider_url: "#",
    luxury_level: 5, is_featured: true, is_sponsored: true,
    created_at: "2026-03-01", updated_at: "2026-05-10",
  },
  {
    id: "l5", boat_id: "b5", boat: mockBoats[4], listing_type: "charter",
    price_per_week: 180000, price_per_day: 28000, currency: "EUR",
    region: "Middle East", country: "UAE", port: "Dubai Marina",
    available_from: "2026-10-01", available_to: "2027-04-30",
    provider: "Dubai Yacht Club", provider_url: "#",
    luxury_level: 5, is_featured: true, is_sponsored: true,
    created_at: "2026-04-01", updated_at: "2026-05-12",
  },
  {
    id: "l6", boat_id: "b6", boat: mockBoats[5], listing_type: "charter",
    price_per_week: 28000, price_per_day: 4500, currency: "EUR",
    region: "Mediterranean", country: "Turkey", port: "Bodrum",
    available_from: "2026-05-15", available_to: "2026-10-15",
    provider: "Blue Voyage", provider_url: "#",
    luxury_level: 3, is_featured: false, is_sponsored: false,
    created_at: "2026-02-28", updated_at: "2026-04-15",
  },
  {
    id: "l7", boat_id: "b1", boat: mockBoats[0], listing_type: "sale",
    sale_price: 8500000, currency: "EUR",
    region: "Mediterranean", country: "Italy", port: "Viareggio",
    provider: "Azimut Yachts", provider_url: "#",
    luxury_level: 5, is_featured: false, is_sponsored: false,
    created_at: "2026-03-15", updated_at: "2026-05-01",
  },
  {
    id: "l8", boat_id: "b2", boat: mockBoats[1], listing_type: "charter",
    price_per_week: 38000, price_per_day: 6500, currency: "EUR",
    region: "Caribbean", country: "BVI", port: "Tortola",
    available_from: "2026-11-01", available_to: "2027-04-30",
    provider: "Island Dreams Charters", provider_url: "#",
    luxury_level: 4, is_featured: false, is_sponsored: false,
    created_at: "2026-04-10", updated_at: "2026-05-08",
  },
];

export function generateMockRecommendations(query: string): Recommendation[] {
  const q = query.toLowerCase();

  let scored = mockListings.map((listing) => {
    let score = 0.3 + Math.random() * 0.2;
    const reasons: Recommendation["match_reasons"] = [];

    if (q.includes("croatia") && listing.country === "Croatia") {
      score += 0.3;
      reasons.push({ category: "region", label: "Croatia match", strength: "strong" });
    }
    if (q.includes("greece") && listing.country === "Greece") {
      score += 0.3;
      reasons.push({ category: "region", label: "Greece match", strength: "strong" });
    }
    if (q.includes("dubai") && listing.country === "UAE") {
      score += 0.3;
      reasons.push({ category: "region", label: "Dubai match", strength: "strong" });
    }
    if (q.includes("monaco") && listing.country === "France") {
      score += 0.3;
      reasons.push({ category: "region", label: "Monaco match", strength: "strong" });
    }
    if (q.includes("ibiza") && listing.country === "Spain") {
      score += 0.3;
      reasons.push({ category: "region", label: "Ibiza match", strength: "strong" });
    }
    if (q.includes("turkey") && listing.country === "Turkey") {
      score += 0.3;
      reasons.push({ category: "region", label: "Turkey match", strength: "strong" });
    }

    if (q.includes("luxury") || q.includes("superyacht")) {
      if (listing.luxury_level >= 4) {
        score += 0.2;
        reasons.push({ category: "luxury", label: `Luxury Level ${listing.luxury_level}/5`, strength: "strong" });
      }
    }

    if (q.includes("family")) {
      if (listing.boat.guests >= 8 && listing.boat.cabins >= 4) {
        score += 0.25;
        reasons.push({ category: "size", label: `${listing.boat.cabins} cabins, ${listing.boat.guests} guests`, strength: "strong" });
      }
    }

    if (q.includes("sport") || q.includes("performance")) {
      if (listing.boat.type === "speedboat") {
        score += 0.25;
        reasons.push({ category: "type", label: "Sport yacht", strength: "strong" });
      }
    }

    if (q.includes("catamaran")) {
      if (listing.boat.type === "catamaran") {
        score += 0.3;
        reasons.push({ category: "type", label: "Catamaran match", strength: "strong" });
      }
    }

    if (q.includes("sailing")) {
      if (listing.boat.type === "sailing") {
        score += 0.3;
        reasons.push({ category: "type", label: "Sailing yacht", strength: "strong" });
      }
    }

    if (q.includes("charter") && listing.listing_type === "charter") {
      score += 0.1;
      reasons.push({ category: "type", label: "Charter available", strength: "moderate" });
    }
    if (q.includes("buy") && listing.listing_type === "sale") {
      score += 0.1;
      reasons.push({ category: "type", label: "For sale", strength: "moderate" });
    }

    if (listing.is_sponsored) score += 0.05;

    if (reasons.length === 0) {
      reasons.push({ category: "features", label: "General match", strength: "partial" });
    }

    return {
      listing,
      score: Math.min(score, 0.99),
      match_reasons: reasons,
      ai_summary: generateSummary(listing, reasons),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6);
}

function generateSummary(listing: Listing, reasons: Recommendation["match_reasons"]): string {
  const boat = listing.boat;
  const regionMatch = reasons.find((r) => r.category === "region");
  const typeMatch = reasons.find((r) => r.category === "type");

  let summary = `The ${boat.name} is a ${boat.length_ft}ft ${boat.type} yacht`;

  if (regionMatch) {
    summary += ` based in ${listing.port}, ${listing.country}`;
  }

  if (listing.listing_type === "charter" && listing.price_per_week) {
    summary += `. Available for charter at €${listing.price_per_week.toLocaleString()}/week`;
  } else if (listing.listing_type === "sale" && listing.sale_price) {
    summary += `. Listed for sale at €${listing.sale_price.toLocaleString()}`;
  }

  summary += `. With ${boat.cabins} cabins accommodating up to ${boat.guests} guests`;

  if (typeMatch) {
    summary += `, this is an excellent match for your request`;
  }

  return summary + ".";
}
