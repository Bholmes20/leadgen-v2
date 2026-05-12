export type Service = "junk-removal" | "landscaping";

export interface EstimateInput {
  service: Service;
  details: string;
  photoCount: number;
}

export interface EstimateResult {
  low: number;
  high: number;
  notes: string;
}

// Internal-only estimate logic. Never expose these numbers to the customer.
export function generateEstimate(input: EstimateInput): EstimateResult {
  const { service, details, photoCount } = input;
  const text = details.toLowerCase();

  if (service === "junk-removal") {
    // Rough sizing based on keywords in description
    let baseLow = 150;
    let baseHigh = 300;

    if (text.includes("full truck") || text.includes("truckload")) {
      baseLow = 400; baseHigh = 600;
    } else if (text.includes("half truck") || text.includes("large")) {
      baseLow = 250; baseHigh = 400;
    } else if (text.includes("small") || text.includes("few items")) {
      baseLow = 100; baseHigh = 200;
    }

    // More photos usually means more stuff
    if (photoCount >= 4) {
      baseLow += 50;
      baseHigh += 100;
    }

    if (text.includes("heavy") || text.includes("appliance") || text.includes("mattress")) {
      baseLow += 50;
      baseHigh += 75;
    }

    return {
      low: baseLow,
      high: baseHigh,
      notes: `Junk removal estimate based on description and ${photoCount} photo(s). Review photos before quoting.`,
    };
  }

  if (service === "landscaping") {
    let baseLow = 200;
    let baseHigh = 500;

    if (text.includes("weekly") || text.includes("regular") || text.includes("maintenance")) {
      baseLow = 80; baseHigh = 150; // per visit
    } else if (text.includes("cleanup") || text.includes("leaf") || text.includes("trim")) {
      baseLow = 150; baseHigh = 350;
    } else if (text.includes("full") || text.includes("overhaul") || text.includes("install")) {
      baseLow = 500; baseHigh = 1500;
    }

    if (text.includes("large") || text.includes("acre")) {
      baseLow *= 2;
      baseHigh *= 2;
    }

    return {
      low: baseLow,
      high: baseHigh,
      notes: `Landscaping estimate based on description. Site visit likely needed before final quote.`,
    };
  }

  return { low: 0, high: 0, notes: "Unknown service type." };
}
