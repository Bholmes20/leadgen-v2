import type { City } from "./types";

// The seven launch markets across the CSRA (Central Savannah River Area).
// `nearby` slugs drive internal linking between market pages for the same niche.
export const CITIES: City[] = [
  {
    slug: "augusta-ga",
    name: "Augusta",
    state: "GA",
    county: "Richmond County",
    zips: ["30901", "30904", "30906", "30907", "30909"],
    areas: [
      "Summerville",
      "Harrisburg",
      "Downtown & the Medical District",
      "West Augusta",
      "South Augusta",
      "Barton Chapel",
      "Forest Hills",
      "National Hills",
      "the Augusta University area",
    ],
    nearby: ["north-augusta-sc", "martinez-ga", "hephzibah-ga"],
    blurb:
      "The Richmond County seat — a mix of historic Summerville and Harrisburg homes, downtown rentals near the medical district and Augusta University, and larger south-side lots.",
  },
  {
    slug: "evans-ga",
    name: "Evans",
    state: "GA",
    county: "Columbia County",
    zips: ["30809"],
    areas: [
      "Riverwood",
      "Evans Towne Center",
      "the Hardy McManus corridor",
      "Mullins Crossing",
      "Gibbs Road",
    ],
    nearby: ["martinez-ga", "grovetown-ga", "augusta-ga"],
    blurb:
      "An affluent Columbia County suburb of newer subdivisions, HOA neighborhoods, and family homes.",
  },
  {
    slug: "grovetown-ga",
    name: "Grovetown",
    state: "GA",
    county: "Columbia County",
    zips: ["30813"],
    areas: [
      "Canterbury Farms",
      "Euchee Creek",
      "the Wrightsboro Road corridor",
      "Horizon South",
      "near Fort Eisenhower",
    ],
    nearby: ["evans-ga", "martinez-ga", "augusta-ga"],
    blurb:
      "One of the fastest-growing cities in the CSRA, next to Fort Eisenhower — lots of newer construction and frequent PCS military moves.",
  },
  {
    slug: "martinez-ga",
    name: "Martinez",
    state: "GA",
    county: "Columbia County",
    zips: ["30907"],
    areas: [
      "West Lake",
      "Riverside",
      "the Columbia Road corridor",
      "Furys Ferry",
    ],
    nearby: ["evans-ga", "augusta-ga", "grovetown-ga"],
    blurb:
      "An established Columbia County suburb of mature lots and long-time homeowners just west of Augusta.",
  },
  {
    slug: "hephzibah-ga",
    name: "Hephzibah",
    state: "GA",
    county: "Richmond County",
    zips: ["30815"],
    areas: [
      "the Windsor Spring corridor",
      "McBean",
      "south Richmond County",
      "rural acreage lots",
    ],
    nearby: ["augusta-ga"],
    blurb:
      "A rural south Richmond County community of larger lots, acreage, and outbuildings.",
  },
  {
    slug: "north-augusta-sc",
    name: "North Augusta",
    state: "SC",
    county: "Aiken County",
    zips: ["29841", "29860", "29851"],
    areas: [
      "Hammond's Ferry",
      "Riverside Village & SRP Park",
      "the Georgia Avenue corridor",
      "Belvedere",
      "Sweetwater",
    ],
    nearby: ["augusta-ga", "aiken-sc"],
    blurb:
      "Across the Savannah River in Aiken County, SC — from riverfront Hammond's Ferry to established Belvedere neighborhoods.",
  },
  {
    slug: "aiken-sc",
    name: "Aiken",
    state: "SC",
    county: "Aiken County",
    zips: ["29801", "29803", "29805"],
    areas: [
      "historic downtown Aiken",
      "the Horse District",
      "Woodside",
      "Cedar Creek",
      "the Whiskey Road corridor",
    ],
    nearby: ["north-augusta-sc", "augusta-ga"],
    blurb:
      "The historic Aiken County seat, known for its downtown, horse farms, and a wide mix of older and estate-sized properties.",
  },
];
