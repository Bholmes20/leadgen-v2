import type { Niche } from "./types";

// The six launch niches. Order here is the canonical display order.
export const NICHES: Niche[] = [
  {
    slug: "rental-property-cleanout",
    label: "Rental Property Cleanout",
    shortLabel: "rental property cleanout",
    blurb: "Clear out everything a former tenant left so a unit is rent-ready fast.",
    hubIntro:
      "Between tenants, a rental can be left full of abandoned furniture, appliances, and trash that stands between you and your next lease. We connect landlords and property managers across the Augusta, GA area with local providers who clear out the whole unit and haul it away. Request a quote and we'll match you with an available local pro.",
    leadService: "junk-removal",
    serviceType: "Rental Property Cleanout",
    keywords: [
      "rental property cleanout",
      "landlord cleanout",
      "move out cleanout",
      "apartment cleanout",
      "rental turnover junk removal",
    ],
    pricing: { low: 175, high: 600, note: "Priced by volume and labor; firm quote before any work." },
    whatWeTake: [
      "Abandoned furniture — sofas, beds, dressers, tables",
      "Mattresses and box springs",
      "Appliances left behind — fridges, washers, dryers, stoves (working or not)",
      "Bagged trash and household clutter from every room",
      "Garage, attic, shed, and closet leftovers",
      "Broken electronics and old TVs",
      "Patio furniture, grills, and yard clutter",
    ],
    whatWeDont: [
      "Hazardous waste or household chemicals",
      "Paint, solvents, motor oil, or fuel",
      "Medical or biohazardous waste",
      "Asbestos-containing materials",
      "A tenant's belongings still under a legal abandoned-property hold (we follow your direction)",
    ],
    faqs: [
      {
        q: "What's included in a rental property cleanout?",
        a: "Everything the previous tenant left behind — furniture, mattresses, appliances (working or not), bagged trash, and clutter from the living space, plus the garage, attic, and shed. We load it all and haul it away, leaving the unit empty and ready to clean.",
      },
      {
        q: "Can I schedule a cleanout without being there?",
        a: "Yes. Many landlords and property managers leave a lockbox or arrange access, and we send photos when the job's done. Just let us know how to get in and where the unit is.",
      },
      {
        q: "How is a cleanout priced?",
        a: "Pricing is based on the volume of material and how much labor and disposal it takes — a light single-room clear-out is at the low end, a packed multi-room unit at the higher end. You get a firm quote before any work starts.",
      },
      {
        q: "What about a tenant's belongings still under an abandoned-property hold?",
        a: "We follow your direction. If local law requires you to store or give notice on abandoned belongings, hold those items and we'll remove everything else — or come back once the notice period has passed.",
      },
    ],
    h1: (city, state) => `Rental Property Cleanout in ${city}, ${state}`,
    metaTitle: (city, state) => `Rental Property Cleanout in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Fast rental property cleanouts in ${city}, ${state}. We clear out furniture, trash, and everything a former tenant left so your unit is rent-ready. Free quote — photos welcome.`,
    overview: (city) =>
      `A rental property cleanout is a full clear-out of a vacated unit — we remove abandoned furniture, mattresses, appliances, bagged trash, and left-behind clutter from every room, plus the garage, attic, or shed, and haul it straight to the truck. The goal is simple: hand you an empty ${city} unit that's ready to clean, paint, and re-list.`,
  },
  {
    slug: "tenant-trash-out",
    label: "Tenant Trash-Out",
    shortLabel: "tenant trash-out",
    blurb: "Heavy post-eviction clear-outs — trash, spoiled food, and left-behind debris.",
    hubIntro:
      "After an eviction or a tenant who skipped, a property can be left in rough shape — full rooms of garbage, soiled furniture, and debris. We match landlords and property-preservation companies in the CSRA with local providers who handle the full trash-out, top to bottom. Tell us about the job and we'll connect you with someone who can take it on.",
    leadService: "junk-removal",
    serviceType: "Tenant Trash-Out Service",
    keywords: [
      "tenant trash out",
      "eviction cleanout",
      "post eviction trash out",
      "REO trash out",
      "property preservation cleanout",
    ],
    pricing: { low: 250, high: 900, note: "Heavier and dirtier than a standard cleanout; quoted after photos or a walkthrough." },
    whatWeTake: [
      "Full-house trash left after an eviction or skip",
      "Spoiled food and refrigerator/freezer contents",
      "Soiled and damaged furniture and mattresses",
      "Bagged and loose garbage in bulk",
      "Appliances and electronics",
      "Yard piles and exterior debris",
      "Top-to-bottom clear-out of the whole property",
    ],
    whatWeDont: [
      "Severe biohazard requiring licensed remediation (we can refer a specialist)",
      "Hazardous waste, chemicals, paint, or solvents",
      "Asbestos-containing materials",
    ],
    faqs: [
      {
        q: "How is a trash-out different from a standard cleanout?",
        a: "A trash-out is the heavier, dirtier version — typically after an eviction or a tenant who skipped, with full rooms of garbage, spoiled food, and soiled furniture. It takes more labor, disposal, and cleanup than a routine cleanout.",
      },
      {
        q: "Do you handle post-eviction and bank-owned (REO) properties?",
        a: "Yes. We regularly clear vacated units for landlords, property managers, and property-preservation companies, and can provide before-and-after photos for your file.",
      },
      {
        q: "Do you clean the unit or just haul the trash?",
        a: "Our core service is removing and hauling everything out. We'll broom-sweep after the haul; for deep cleaning or biohazard remediation we can point you to the right specialist.",
      },
      {
        q: "How fast can a trash-out be scheduled?",
        a: "Same-day or next-day is often available. Send a few photos or a walkthrough video and we'll size the job and get you a firm quote quickly.",
      },
    ],
    h1: (city, state) => `Tenant Trash-Out in ${city}, ${state}`,
    metaTitle: (city, state) => `Tenant Trash-Out in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Post-eviction tenant trash-outs in ${city}, ${state}. Full-house clear-outs of trash, furniture, and debris so your rental is empty and ready to turn. Free quote today.`,
    overview: (city) =>
      `A tenant trash-out goes beyond a normal cleanout — these are the heavy, unpleasant jobs left after an eviction or a tenant who skipped: full rooms of garbage, spoiled food, soiled furniture, and debris. We clear a ${city} property top to bottom and can document the before-and-after for your file.`,
  },
  {
    slug: "renovation-debris-removal",
    label: "Renovation Debris Removal",
    shortLabel: "renovation debris removal",
    blurb: "Haul away drywall, flooring, cabinets, and demo debris so crews keep moving.",
    hubIntro:
      "Renovations and demolition generate debris fast — drywall, torn-out flooring, old cabinets, fixtures, and lumber. We connect contractors and DIY remodelers around Augusta with local providers who haul it off, in a single pickup or throughout a project. Request a quote and we'll match you with an available hauler.",
    leadService: "junk-removal",
    serviceType: "Construction & Renovation Debris Removal",
    keywords: [
      "renovation debris removal",
      "construction debris removal",
      "demo debris haul away",
      "remodel junk removal",
      "contractor debris pickup",
    ],
    pricing: { low: 200, high: 750, note: "Heavier loads (tile, plaster, countertops) priced by weight and volume." },
    whatWeTake: [
      "Drywall, plaster, and lath",
      "Torn-out flooring, carpet, and tile",
      "Old cabinets, countertops, and vanities",
      "Fixtures, sinks, tubs, and toilets",
      "Lumber, trim, doors, and scrap wood",
      "Bagged and loose construction waste",
      "Small roofing tear-off debris",
    ],
    whatWeDont: [
      "Asbestos-containing materials (require licensed abatement first)",
      "Lead-painted debris requiring specialized handling",
      "Wet paint, solvents, and chemicals",
      "Hazardous or flammable materials",
    ],
    faqs: [
      {
        q: "Do you work with contractors on active job sites?",
        a: "Yes — we do single post-demo hauls and recurring pickups throughout a project so debris doesn't pile up. Tell us your schedule and we'll fit the site's workflow.",
      },
      {
        q: "Can you haul heavy materials like tile, plaster, and countertops?",
        a: "Yes. Heavy demo debris is routine — plaster, ceramic tile, cast-iron fixtures, stone or laminate countertops, and loose construction waste. Heavier loads are priced by weight and volume.",
      },
      {
        q: "Can you take asbestos or lead-painted materials?",
        a: "No. Those require a licensed abatement contractor to remove and dispose of first. Once the site is cleared for general debris, we'll haul the rest.",
      },
      {
        q: "Do you offer a dumpster, or do you haul directly?",
        a: "We haul directly — you don't rent, fill, or wait on a dumpster. We bring the truck and labor, load the debris, and take it away.",
      },
    ],
    h1: (city, state) => `Renovation Debris Removal in ${city}, ${state}`,
    metaTitle: (city, state) => `Renovation Debris Removal in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Renovation and demo debris removal in ${city}, ${state}. We haul drywall, flooring, cabinets, and construction waste so your crew keeps moving. Free quote — same-day available.`,
    overview: (city) =>
      `Renovation debris removal takes the mess demolition leaves behind — drywall, plaster, torn-out flooring and tile, old cabinets and countertops, fixtures, lumber, and trim — and hauls it off your ${city} job site. We can do a single post-demo haul or recurring pickups over the course of a project.`,
  },
  {
    slug: "carpet-removal",
    label: "Carpet Removal",
    shortLabel: "carpet removal",
    blurb: "Pull old carpet, padding, and tack strips and leave a clean subfloor.",
    hubIntro:
      "Before new flooring goes in — or after pet or water damage — old carpet has to come out. We connect homeowners and property managers in the Augusta area with local providers who remove the carpet, padding, and tack strips and haul it all away. Request a quote and we'll match you with someone who can prep your floor.",
    leadService: "junk-removal",
    serviceType: "Carpet Removal & Haul-Away",
    keywords: [
      "carpet removal",
      "carpet haul away",
      "old carpet disposal",
      "carpet tear out",
      "carpet and pad removal",
    ],
    pricing: { low: 150, high: 500, unit: "job", note: "Usually priced by number and size of rooms, plus stairs." },
    whatWeTake: [
      "Wall-to-wall carpet and padding",
      "Tack strips around the perimeter",
      "Area rugs and remnants",
      "Carpet from stairs and landings",
      "Staples pulled and subfloor swept for the next installer",
    ],
    whatWeDont: [
      "New flooring installation (we are removal and haul-away only)",
      "Mold remediation beyond removing the affected carpet (we can refer a specialist)",
      "Hazardous or contaminated materials",
    ],
    faqs: [
      {
        q: "Do you remove the padding and tack strips too?",
        a: "Yes — we pull the carpet, the padding underneath, and the tack strips around the perimeter, then sweep the subfloor so it's ready for whatever comes next.",
      },
      {
        q: "Do you install new flooring?",
        a: "No — we're removal and haul-away only. That keeps it fast and affordable, and we'll time the job so the subfloor is ready the day your installer arrives.",
      },
      {
        q: "Can you handle pet-damaged or water-damaged carpet?",
        a: "Yes. We remove odor-heavy, stained, or wet carpet routinely. If there's significant mold, we'll remove what we can and recommend a remediation specialist for the affected area.",
      },
      {
        q: "How is carpet removal priced?",
        a: "Usually by the number and size of rooms, plus stairs. Send room dimensions or a few photos and we'll give you a firm quote before starting.",
      },
    ],
    h1: (city, state) => `Carpet Removal in ${city}, ${state}`,
    metaTitle: (city, state) => `Carpet Removal in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Old carpet removal and haul-away in ${city}, ${state}. We pull carpet, padding, and tack strips and leave a clean subfloor for your new flooring. Free quote — fast response.`,
    overview: (city) =>
      `Carpet removal means we pull the wall-to-wall carpet, the padding underneath, and the tack strips around the edges, then sweep the subfloor clean and haul everything away from your ${city} home. It's removal and disposal only — we don't install new flooring — which keeps it fast and affordable.`,
  },
  {
    slug: "overgrown-property-cleanup",
    label: "Overgrown Property Cleanup",
    shortLabel: "overgrown property cleanup",
    blurb: "Reclaim overgrown lots — tall grass, brush, and saplings cut back and hauled off.",
    hubIntro:
      "An overgrown lot or neglected yard can get out of hand fast, especially on a vacant or inherited property. We connect owners across the CSRA with local providers who cut back the grass, brush, vines, and saplings and haul off what's cleared. Have a code-enforcement deadline? Tell us and we'll match you with someone who can work to it.",
    leadService: "landscaping",
    serviceType: "Overgrown Lot & Property Cleanup",
    keywords: [
      "overgrown property cleanup",
      "overgrown lot clearing",
      "brush and weed removal",
      "vacant lot cleanup",
      "property overgrowth removal",
    ],
    pricing: { low: 250, high: 1200, note: "Depends on lot size and how long it's been left; scoped from photos or a visit." },
    whatWeTake: [
      "Tall grass and weeds",
      "Brush, briars, and vines",
      "Saplings and small trees",
      "Fallen limbs and branches",
      "Accumulated yard debris",
      "Haul-away of everything cut",
    ],
    whatWeDont: [
      "Full-size tree felling and stump grinding (require a licensed arborist)",
      "Chemical weed or vegetation treatment",
      "Cleanup of hazardous or illegally-dumped materials",
    ],
    faqs: [
      {
        q: "How overgrown is too overgrown?",
        a: "Rarely too much — tall grass, weeds, brush, briars, vines, and saplings are all in scope, even on lots that haven't been touched in years. We cut it back and haul off what we clear.",
      },
      {
        q: "Do you haul away what you cut, or just cut it?",
        a: "We haul it off. The property is left cleared and cleaned up, not covered in piles of cut brush for you to deal with.",
      },
      {
        q: "Can you take down trees?",
        a: "We handle saplings and small trees. Full-size tree felling and stump grinding call for a licensed arborist, and we'll tell you if a job crosses that line.",
      },
      {
        q: "Do you handle code-enforcement violation cleanups?",
        a: "Yes — send us your notice date and we'll schedule the clearing to beat the deadline, then haul off everything we cut.",
      },
    ],
    h1: (city, state) => `Overgrown Property Cleanup in ${city}, ${state}`,
    metaTitle: (city, state) => `Overgrown Property Cleanup in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Overgrown property and lot cleanup in ${city}, ${state}. We cut back tall grass, brush, and saplings and haul it all off. Code-deadline jobs welcome. Free quote today.`,
    overview: (city) =>
      `Overgrown property cleanup reclaims a lot that's gotten out of control — tall grass, weeds, brush, briars, vines, and saplings cut back to a manageable state, with everything we cut hauled off the ${city} property. It's ideal for vacant lots, neglected rentals, estates, and code-enforcement deadlines.`,
  },
  {
    slug: "playset-outdoor-structure-removal",
    label: "Playset & Outdoor Structure Removal",
    shortLabel: "playset and outdoor structure removal",
    blurb: "Tear down and haul away swing sets, trampolines, sheds, and small structures.",
    hubIntro:
      "When a playset, trampoline, shed, or old pool has outlived its use, taking it apart is a weekend you'd rather skip. We connect homeowners in the Augusta area with local providers who handle the teardown and haul every piece away. Request a quote and we'll match you with an available pro.",
    leadService: "junk-removal",
    serviceType: "Playset & Outdoor Structure Removal",
    keywords: [
      "playset removal",
      "swing set removal",
      "trampoline removal",
      "shed removal",
      "above ground pool removal",
    ],
    pricing: { low: 200, high: 800, note: "We handle the teardown; priced by structure size and haul volume." },
    whatWeTake: [
      "Wooden and metal swing sets and playsets",
      "Trampolines",
      "Old sheds",
      "Above-ground pools",
      "Small decks, gazebos, and pergolas",
      "Sections of fencing",
      "Dog kennels and runs",
    ],
    whatWeDont: [
      "In-ground pool demolition (requires a specialized contractor)",
      "Large concrete slab removal",
      "Hazardous materials",
    ],
    faqs: [
      {
        q: "Do I need to disassemble it first?",
        a: "No — we handle the teardown on site, whether it's a bolted-together wooden playset, a welded metal swing set, or an above-ground pool. You don't need to touch it.",
      },
      {
        q: "What structures do you remove?",
        a: "Swing sets and playsets (wood or metal), trampolines, sheds, above-ground pools, small decks, gazebos, pergolas, sections of fencing, and dog kennels — disassembled and hauled.",
      },
      {
        q: "Will my yard be damaged where it stood?",
        a: "There's usually some bare or flattened ground where a structure sat, especially under a pool or trampoline. We remove all the material and hardware; re-seeding or leveling the spot is up to you.",
      },
      {
        q: "Do you remove old sheds and small decks?",
        a: "Yes — old sheds, small decks, gazebos, and similar structures come apart and haul away just like a playset. For large decks or anything on a full concrete slab, we'll scope it first.",
      },
    ],
    h1: (city, state) => `Playset & Outdoor Structure Removal in ${city}, ${state}`,
    metaTitle: (city, state) => `Playset & Structure Removal in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Playset, shed, and outdoor structure removal in ${city}, ${state}. We disassemble and haul away swing sets, trampolines, sheds, and pools. Free quote — we do the teardown.`,
    overview: (city) =>
      `We disassemble and haul away the outdoor structures you're done with — wooden and metal playsets, swing sets, trampolines, old sheds, above-ground pools, small decks, gazebos, and fencing. You don't need to take anything apart first; we handle the teardown and clear every piece from your ${city} yard.`,
  },
];
