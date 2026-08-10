import type { LocalContent } from "./types";

// Per-(niche, city) unique local content. This array is the publish allow-list:
// a niche × city page goes live ONLY when it has an entry here with a real local
// intro (>= 80 chars) and at least one city-specific FAQ. Add an entry to publish a
// page; the registry validates slugs and the publish gate in pages.ts.
//
// Deliberately NOT the full 6×7 cartesian product — each entry is hand-written and
// locally differentiated so these are genuinely useful pages, not thin doorways.
export const LOCAL_CONTENT: LocalContent[] = [
  // ── Augusta — all six niches (flagship market) ───────────────────────────────
  {
    niche: "rental-property-cleanout",
    city: "augusta-ga",
    intro:
      "Turning over a rental in Augusta means getting a unit rent-ready before you lose a month of income — whether it's a student rental near Augusta University, an older duplex in Harrisburg, or a downtown apartment by the medical district. We clear out everything a departing tenant left behind so you can paint, clean, and re-list fast. Serving all of Richmond County, from Summerville to south Augusta.",
    localFaqs: [
      {
        q: "How quickly can you clear an Augusta rental between tenants?",
        a: "For most single-unit Augusta cleanouts we can respond same-day or next-day. If you're turning over a student rental near Augusta University on a tight academic-calendar deadline, tell us your relist date and we'll prioritize the schedule.",
      },
      {
        q: "Do you serve rentals across all of Augusta?",
        a: "Yes — from downtown apartments and Harrisburg duplexes to single-family rentals in west and south Augusta and out toward Barton Chapel. If it's in Richmond County, we cover it.",
      },
    ],
  },
  {
    niche: "tenant-trash-out",
    city: "augusta-ga",
    intro:
      "Post-eviction and skip cleanouts in Augusta are rarely pretty — full houses of trash, spoiled food, and furniture left to rot. We handle the heavy, unpleasant trash-outs Richmond County landlords and property managers don't want to touch, top to bottom, so the unit is empty and ready for turnover. Before-and-after photos for your file included on request.",
    localFaqs: [
      {
        q: "Do you handle post-eviction trash-outs for Augusta landlords and property managers?",
        a: "Yes. We regularly clear vacated Augusta units after evictions and skips, including bank-owned and property-preservation jobs, and can document the before-and-after for your records.",
      },
    ],
  },
  {
    niche: "renovation-debris-removal",
    city: "augusta-ga",
    intro:
      "Augusta's older housing stock — the historic homes in Summerville and Harrisburg, mid-century houses across west Augusta — means a lot of gut renovations and tear-outs. When the demo's done, we haul the drywall, plaster, old cabinets, and torn-out flooring so your crew keeps moving. We work with Augusta contractors and DIY remodelers alike.",
    localFaqs: [
      {
        q: "Can you haul renovation debris from older Augusta homes?",
        a: "Absolutely — plaster, lath, heavy tile, cast-iron fixtures, and old cabinetry from Summerville and Harrisburg remodels are routine for us. Just note that we don't remove asbestos or lead materials; those require a licensed abatement contractor first.",
      },
    ],
  },
  {
    niche: "carpet-removal",
    city: "augusta-ga",
    intro:
      "Whether you're prepping an Augusta rental for new flooring, tearing out pet-damaged carpet in a Forest Hills home, or clearing water-damaged carpet after a leak, we pull the carpet, padding, and tack strips and haul it all away. You're left with a clean subfloor ready for the next installer. Serving Augusta and Richmond County.",
    localFaqs: [
      {
        q: "Can you remove old carpet before my new flooring is installed in Augusta?",
        a: "Yes — that's one of our most common Augusta jobs. We coordinate around your installer's start date so the subfloor is cleared, swept, and ready the day they arrive.",
      },
    ],
  },
  {
    niche: "overgrown-property-cleanup",
    city: "augusta-ga",
    intro:
      "From neglected rental yards in south Augusta to vacant lots that have drawn a code-enforcement notice, we reclaim overgrown Richmond County properties — tall grass, brush, briars, vines, and saplings cut back and hauled off. If the city's given you a deadline, tell us and we'll work to it.",
    localFaqs: [
      {
        q: "Can you handle an Augusta code-enforcement overgrowth violation on a deadline?",
        a: "Yes. Send us the notice date and property address and we'll schedule the clearing to beat your Richmond County compliance deadline, then haul off everything we cut.",
      },
    ],
  },
  {
    niche: "playset-outdoor-structure-removal",
    city: "augusta-ga",
    intro:
      "Kids grew up, the swing set's rusting, the old shed's falling in — we disassemble and haul away playsets, trampolines, sheds, above-ground pools, and small decks across Augusta and Richmond County. You get your backyard back without spending a weekend with a reciprocating saw.",
    localFaqs: [
      {
        q: "Do I need to take the playset apart before you remove it in Augusta?",
        a: "No — we handle the disassembly. Whether it's a big wooden playset in west Augusta or a rusted metal swing set, we break it down on site and haul every piece away.",
      },
    ],
  },

  // ── Evans — high-intent landlord niches ──────────────────────────────────────
  {
    niche: "rental-property-cleanout",
    city: "evans-ga",
    intro:
      "Evans rentals tend to be newer subdivision homes in HOA neighborhoods — which means turnovers need to look sharp and happen fast to keep the neighbors and the board happy. We clear out whatever the last tenant left so your Columbia County rental is ready to show, from Riverwood to the Hardy McManus corridor.",
    localFaqs: [
      {
        q: "Do you work in Evans HOA neighborhoods?",
        a: "Yes, throughout Evans and Columbia County. We keep the job tidy and load straight to the truck so there's no debris left curbside to violate HOA rules.",
      },
    ],
  },
  {
    niche: "tenant-trash-out",
    city: "evans-ga",
    intro:
      "Even in a sought-after Columbia County suburb like Evans, a bad tenant can leave a house full of trash behind. We handle the full post-eviction trash-out — spoiled food, soiled furniture, bagged garbage, and clutter — so your Evans rental goes from wrecked to empty and ready to turn.",
    localFaqs: [
      {
        q: "How discreetly can you do a trash-out in an Evans neighborhood?",
        a: "We work efficiently and load straight to the truck, which keeps a messy Evans turnover from becoming a spectacle for the HOA or the neighbors.",
      },
    ],
  },

  // ── Martinez ─────────────────────────────────────────────────────────────────
  {
    niche: "rental-property-cleanout",
    city: "martinez-ga",
    intro:
      "Many Martinez rentals are established homes with mature yards and years of accumulated storage in the garage, attic, or shed. When a tenant moves on, we clear out what's left across the whole property so your Columbia County rental is ready to re-list — from West Lake to the Columbia Road corridor.",
    localFaqs: [
      {
        q: "Can you clear out the garage and shed too on a Martinez rental?",
        a: "Yes — on Martinez turnovers we clear the whole property, including garage, attic, and shed leftovers, not just the interior living space.",
      },
    ],
  },

  // ── Grovetown — Fort Eisenhower / PCS turnover angle ─────────────────────────
  {
    niche: "rental-property-cleanout",
    city: "grovetown-ga",
    intro:
      "Grovetown's rapid growth near Fort Eisenhower means a lot of newer rentals cycling through military and civilian tenants. We get your Grovetown unit cleared and rent-ready between tenants, handling whatever furniture, appliances, and clutter got left behind. Serving Canterbury Farms, Euchee Creek, and the Wrightsboro Road corridor.",
    localFaqs: [
      {
        q: "Can you turn a Grovetown rental around on a tight timeline?",
        a: "Yes — with the frequent PCS-driven turnover around Fort Eisenhower, fast Grovetown cleanouts are our norm. Same-day and next-day scheduling is often available.",
      },
    ],
  },
  {
    niche: "tenant-trash-out",
    city: "grovetown-ga",
    intro:
      "Grovetown sits right next to Fort Eisenhower, so rentals here see constant military turnover and the occasional rushed or abandoned move-out. We handle full trash-outs on Grovetown rentals — including units left in bad shape after a sudden PCS or eviction — so you can turn the property around fast for the next tenant.",
    localFaqs: [
      {
        q: "Do you handle Grovetown rentals left behind after a PCS or military move-out?",
        a: "Yes. With Fort Eisenhower next door, we're used to Grovetown turnovers on short notice, including units a service member left in a hurry. Tell us your timeline and we'll work to it.",
      },
    ],
  },

  // ── Hephzibah — rural large-lot overgrowth ───────────────────────────────────
  {
    niche: "overgrown-property-cleanup",
    city: "hephzibah-ga",
    intro:
      "Hephzibah's large rural lots and acreage in south Richmond County can turn into a jungle after a neglected season — tall grass, briars, brush, and saplings taking over. We clear overgrown Hephzibah properties and outbuilding surrounds and haul off what we cut, whether it's a rental, a vacant lot, or an inherited property along the Windsor Spring corridor.",
    localFaqs: [
      {
        q: "Do you handle large overgrown lots and acreage in Hephzibah?",
        a: "Yes — the bigger rural lots around Hephzibah and south Richmond County are a good fit. Tell us roughly how much area needs clearing and how long it's been left, and we'll scope it.",
      },
    ],
  },

  // ── North Augusta, SC ────────────────────────────────────────────────────────
  {
    niche: "rental-property-cleanout",
    city: "north-augusta-sc",
    intro:
      "North Augusta rentals range from riverfront units near Hammond's Ferry and SRP Park to established homes in Belvedere and Sweetwater. We clear out Aiken County, SC turnovers just as fast as we do across the river in Georgia, so your unit doesn't sit empty. Whatever the last tenant left, we haul it.",
    localFaqs: [
      {
        q: "Do you serve North Augusta and Aiken County, SC as well as Georgia?",
        a: "Yes — we cross the river regularly. North Augusta, Belvedere, and the SRP Park / Riverside Village area are all part of our normal service range.",
      },
    ],
  },
  {
    niche: "carpet-removal",
    city: "north-augusta-sc",
    intro:
      "Prepping a North Augusta home for new flooring? We tear out old carpet, padding, and tack strips and haul it away across Aiken County, SC — from riverfront condos near SRP Park to family homes in Belvedere. You're left with a clean subfloor ready for your installer.",
    localFaqs: [
      {
        q: "Can you remove carpet in North Augusta and haul it across the river?",
        a: "Yes — disposal is handled on our end whether the job is in North Augusta, Belvedere, or elsewhere in Aiken County. You don't have to haul old carpet anywhere.",
      },
    ],
  },

  // ── Aiken, SC — estate / horse-country overgrowth ────────────────────────────
  {
    niche: "overgrown-property-cleanup",
    city: "aiken-sc",
    intro:
      "Aiken's larger properties — from horse-district acreage to older estate lots off Whiskey Road — can get away from you fast when a season or two goes unmanaged. We clear overgrown Aiken County grass, brush, vines, and saplings and haul off everything we cut, so the property looks maintained again.",
    localFaqs: [
      {
        q: "Can you clear a large or estate-sized overgrown lot in Aiken?",
        a: "Yes — Aiken's bigger properties and horse-country lots are well within our range. For anything requiring full-size tree felling or stump grinding we'll point you to a licensed arborist, but the grass, brush, and saplings we handle and haul.",
      },
    ],
  },
];
