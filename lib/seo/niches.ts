import type { Niche } from "./types";

// Canonical display order. The high-intent Grovetown-area pickup niches lead, ahead of
// the property-cleanout niches.
export const NICHES: Niche[] = [
  {
    slug: "mattress-removal",
    label: "Mattress & Box Spring Removal",
    shortLabel: "mattress removal",
    blurb: "Haul away old mattresses and box springs — curbside pickup is quickest.",
    hubIntro:
      "Old mattresses and box springs are bulky, awkward, and impossible to fit in a car — so they tend to pile up in garages and spare rooms. We pick them up and haul them away for homeowners, renters, and landlords across the Augusta, GA area. Set them at the curb or in the driveway and it's usually the quickest for us to quote. Request a free quote and we'll confirm scope and price before any work begins.",
    leadService: "junk-removal",
    serviceType: "Mattress & Box Spring Removal",
    keywords: [
      "mattress removal",
      "mattress disposal",
      "box spring removal",
      "mattress pickup",
      "old mattress haul away",
    ],
    pricing: { note: "Priced per piece and by access; firm quote before any work." },
    whatWeTake: [
      "Mattresses of every size — twin, full, queen, king, and California king",
      "Box springs and foundations",
      "Bed frames, headboards, and footboards",
      "Futons, sofa-bed mattresses, and crib mattresses",
      "Bunk beds and daybeds",
      "Mattress toppers and bedding set out with the mattress",
    ],
    whatWeDont: [
      "Mattresses with an active bed-bug infestation that haven't been sealed in a bag (ask us how to prep)",
      "Items soaked or contaminated with hazardous material",
      "Household chemicals, paint, or solvents",
    ],
    faqs: [
      {
        q: "Do I need to put the mattress at the curb?",
        a: "Curbside or driveway pickup is encouraged — it's the quickest and easiest for us to quote. If you can safely set the mattress and box spring outside, that's ideal. Indoor removal from a bedroom or upstairs is available too, but confirm it in your quote request so we can plan the carry.",
      },
      {
        q: "Do you take the box spring and bed frame as well?",
        a: "Yes — we take the mattress, the box spring or foundation, and the bed frame, headboard, and footboard if you want them gone too. Just list everything in your request so the quote covers it all.",
      },
      {
        q: "Can you remove a mattress from an upstairs bedroom or apartment?",
        a: "Often yes, but indoor and upstairs removal depends on the stairs and access, so it's quoted case by case. Note the floor and whether there are stairs or an elevator in your request and we'll confirm it in the quote.",
      },
      {
        q: "How do you price mattress removal?",
        a: "By the number of pieces and how easy they are to reach. A single mattress and box spring left curbside is at the low end; multiple beds carried down from inside is more. Send a photo and we'll give you a firm quote before any work begins.",
      },
    ],
    h1: (city, state) => `Mattress & Box Spring Removal in ${city}, ${state}`,
    metaTitle: (city, state) => `Mattress Removal in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Old mattress and box spring removal in ${city}, ${state}. Curbside pickup encouraged; indoor removal by quote. Great for PCS moves, move-outs, and bed replacements. Quote from photos.`,
    overview: (city) =>
      `Mattress removal is a simple pickup-and-haul: we take your old mattress, the box spring or foundation, and the bed frame if you want it gone, and haul it away from your ${city} home. Curbside or driveway pickup is encouraged and quickest to quote; indoor or upstairs removal is available when you confirm it in the quote. It's ideal for PCS moves, apartment move-outs, rental turnovers, and old bed replacements.`,
  },
  {
    slug: "furniture-removal",
    label: "Furniture & Couch Removal",
    shortLabel: "furniture removal",
    blurb: "Pick up and haul away couches, sofas, and heavy furniture.",
    hubIntro:
      "Couches, sectionals, and heavy furniture are the items that are hardest to get rid of on your own. We pick them up and haul them off for homeowners, renters, and landlords across the Augusta, GA area — from a single couch to a houseful. Curbside or driveway pickup is usually quickest to quote. Request a free quote and we'll confirm scope and price before any work begins.",
    leadService: "junk-removal",
    serviceType: "Furniture & Couch Removal",
    keywords: [
      "furniture removal",
      "couch removal",
      "sofa pickup",
      "furniture disposal",
      "old furniture haul away",
    ],
    pricing: { note: "Priced by piece count, size, and access; firm quote before any work." },
    whatWeTake: [
      "Couches, sofas, loveseats, and sectionals",
      "Recliners, armchairs, and ottomans",
      "Dressers, nightstands, and wardrobes",
      "Dining tables, chairs, and china cabinets",
      "Desks, bookshelves, and entertainment centers",
      "Coffee tables, end tables, and patio furniture",
    ],
    whatWeDont: [
      "Furniture with an active bed-bug infestation that hasn't been sealed or wrapped (ask us how to prep)",
      "Items contaminated with hazardous material",
      "Household chemicals, paint, or solvents",
    ],
    faqs: [
      {
        q: "Can you take a heavy sectional or a sleeper sofa?",
        a: "Yes — sectionals, sleeper sofas, and oversized recliners are routine. If a piece needs to come apart to get through a doorway or down the stairs, we handle that on site; just flag it in your request so the quote accounts for it.",
      },
      {
        q: "Do I have to move the furniture outside first?",
        a: "No, but curbside or driveway pickup is encouraged because it's the quickest and easiest to quote. If the furniture is still inside or upstairs, note the floor and any stairs in your request and we'll confirm the carry in your quote.",
      },
      {
        q: "Can you pick up just one couch?",
        a: "Yes — a single-item couch or furniture pickup is completely fine, and so is a full house of furniture. Tell us what you've got and we'll quote it.",
      },
      {
        q: "How is furniture removal priced?",
        a: "By how many pieces, how big and heavy they are, and how easy they are to reach. A couch set at the curb is at the low end; several heavy pieces carried from inside is more. Send a photo for a firm quote before any work begins.",
      },
    ],
    h1: (city, state) => `Furniture & Couch Removal in ${city}, ${state}`,
    metaTitle: (city, state) => `Furniture & Couch Removal in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Couch, sofa, and furniture removal in ${city}, ${state}. From a single couch to a whole house — curbside pickup encouraged, indoor by quote. Quote from photos.`,
    overview: (city) =>
      `Furniture removal is a pickup-and-haul for the bulky pieces you're done with — couches, sofas, sectionals, recliners, dressers, tables, and desks — cleared out of your ${city} home and hauled away. Curbside or driveway pickup is encouraged and quickest to quote; indoor or upstairs removal is available when you confirm it in the quote. It's a fit for PCS moves, apartment move-outs, rental turnovers, and furniture upgrades.`,
  },
  {
    slug: "appliance-removal",
    label: "Appliance Removal",
    shortLabel: "appliance removal",
    blurb: "Haul off washers, dryers, stoves, and other large appliances.",
    hubIntro:
      "When an appliance dies or gets replaced, the old one is heavy and awkward to move. We haul off washers, dryers, stoves, dishwashers, and other large appliances for homeowners, renters, and landlords across the Augusta, GA area. Curbside, garage, or driveway pickup is usually quickest to quote. Request a free quote and we'll confirm scope and price before any work begins.",
    leadService: "junk-removal",
    serviceType: "Appliance Removal & Haul-Away",
    keywords: [
      "appliance removal",
      "washer dryer removal",
      "old appliance haul away",
      "appliance pickup",
      "large appliance disposal",
    ],
    pricing: { note: "Priced per appliance and by access; firm quote before any work." },
    whatWeTake: [
      "Washers and dryers",
      "Stoves, ovens, and ranges",
      "Dishwashers and built-in microwaves",
      "Water heaters",
      "Trash compactors and garbage disposals",
      "Countertop microwaves and small appliances",
    ],
    whatWeDont: [
      "Refrigerators, freezers, and window AC units where the refrigerant hasn't been recovered — certified handling may be required first; note it and we'll advise in your quote",
      "Appliances leaking oil, fuel, or hazardous fluid",
      "Hazardous waste, chemicals, or solvents",
    ],
    faqs: [
      {
        q: "Do you disconnect the appliance, or should it be unhooked already?",
        a: "It's quickest if the appliance is already unhooked and pulled away from the wall. We can handle basic disconnects on site in many cases — note it in your request so the quote reflects it. For gas lines and permanent plumbing, have a licensed tradesperson disconnect first.",
      },
      {
        q: "Can you take a refrigerator or freezer?",
        a: "Refrigerators, freezers, and window AC units contain refrigerant that may need to be recovered by a certified technician before disposal. Tell us about the unit in your request and we'll advise on the handling and confirm it in your quote — we don't make promises about refrigerant work sight unseen.",
      },
      {
        q: "Do you take washers and dryers from the laundry room?",
        a: "Yes. Curbside or garage pickup is quickest to quote, but if the washer and dryer are still in an interior laundry room or upstairs, note the floor and any stairs in your request and we'll confirm the carry in your quote.",
      },
      {
        q: "How is appliance removal priced?",
        a: "By the number of appliances and how easy they are to reach. One unit in the garage is at the low end; several carried out from inside is more. Send a photo and we'll give you a firm quote before any work begins.",
      },
    ],
    h1: (city, state) => `Appliance Removal in ${city}, ${state}`,
    metaTitle: (city, state) => `Appliance Removal in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Old appliance removal in ${city}, ${state} — washers, dryers, stoves, dishwashers, and more. Curbside or garage pickup encouraged. Quote from photos, firm price before any work.`,
    overview: (city) =>
      `Appliance removal is a haul-away for the heavy machines you're replacing — washers, dryers, stoves, dishwashers, water heaters, and more — taken out of your ${city} home and hauled off. Curbside, garage, or driveway pickup is encouraged and quickest to quote; interior or upstairs removal is available when you confirm it in the quote. Refrigerators, freezers, and AC units contain refrigerant, so tell us about those and we'll advise on handling in your quote.`,
  },
  {
    slug: "bulk-item-pickup",
    label: "Bulk Item Pickup",
    shortLabel: "bulk item pickup",
    blurb: "One or a few large, heavy items picked up and hauled away.",
    hubIntro:
      "Sometimes it's not a whole cleanout — just one or two big, heavy items that won't fit in your car and won't go out with the regular trash. We pick up bulk items for homeowners, renters, and landlords across the Augusta, GA area and haul them off. Set them curbside or in the driveway and it's usually the quickest for us to quote. Request a free quote and we'll confirm scope and price before any work begins.",
    leadService: "junk-removal",
    serviceType: "Bulk Item Pickup & Haul-Away",
    keywords: [
      "bulk item pickup",
      "bulk trash pickup",
      "large item removal",
      "bulky waste pickup",
      "single item haul away",
    ],
    pricing: { note: "Priced by number and size of items and access; firm quote before any work." },
    whatWeTake: [
      "Mattresses, box springs, and furniture",
      "Appliances like washers, dryers, and stoves",
      "Exercise equipment and treadmills",
      "Grills, patio furniture, and planters",
      "Old TVs, electronics, and small e-waste",
      "Rugs, bagged clutter, and odds and ends set out with the big items",
    ],
    whatWeDont: [
      "Refrigerant-containing fridges, freezers, or AC units until the refrigerant is handled — note it and we'll advise in your quote",
      "Hazardous waste, chemicals, paint, or solvents",
      "Full demolition or construction debris loads (ask about renovation debris removal)",
    ],
    faqs: [
      {
        q: "What counts as a bulk item?",
        a: "Any single large or heavy item that's awkward to move and won't go out with your normal trash — a mattress, a couch, a treadmill, a grill, an old TV, a washer or dryer. If you've got one item or a small handful, bulk item pickup is the fit.",
      },
      {
        q: "Can I schedule a pickup for just one item?",
        a: "Yes — single-item pickups are welcome, and so are small batches of a few items. Tell us what you've got and we'll quote it.",
      },
      {
        q: "Should the items be at the curb?",
        a: "Curbside or driveway pickup is encouraged because it's the quickest and easiest to quote. If an item is still inside or upstairs, note the floor and any stairs in your request and we'll confirm the carry in your quote.",
      },
      {
        q: "How is bulk item pickup priced?",
        a: "By how many items, how big and heavy they are, and how easy they are to reach. A single item at the curb is at the low end; several heavy pieces carried from inside is more. Send a photo for a firm quote before any work begins.",
      },
    ],
    h1: (city, state) => `Bulk Item Pickup in ${city}, ${state}`,
    metaTitle: (city, state) => `Bulk Item Pickup in ${city}, ${state}`,
    metaDescription: (city, state) =>
      `Bulk item pickup in ${city}, ${state} — one large item or a small batch picked up and hauled away. Curbside pickup encouraged. Quote from photos, firm price before any work.`,
    overview: (city) =>
      `Bulk item pickup is for the one-off big stuff — a single mattress, couch, appliance, treadmill, or grill, or a small handful of heavy items — picked up and hauled away from your ${city} home without booking a full cleanout. Curbside or driveway pickup is encouraged and quickest to quote; indoor or upstairs removal is available when you confirm it in the quote.`,
  },
  {
    slug: "rental-property-cleanout",
    label: "Rental Property Cleanout",
    shortLabel: "rental property cleanout",
    blurb: "Clear out everything a former tenant left so a unit is rent-ready fast.",
    hubIntro:
      "Between tenants, a rental can be left full of abandoned furniture, appliances, and trash that stands between you and your next lease. We work with landlords and property managers across the Augusta, GA area to clear out the whole unit and haul it away. Request a free quote and we'll confirm scope and price before any work begins.",
    leadService: "junk-removal",
    serviceType: "Rental Property Cleanout",
    keywords: [
      "rental property cleanout",
      "landlord cleanout",
      "move out cleanout",
      "apartment cleanout",
      "rental turnover junk removal",
    ],
    pricing: { note: "Priced by volume and labor; firm quote before any work." },
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
      "After an eviction or a tenant who skipped, a property can be left in rough shape — full rooms of garbage, soiled furniture, and debris. We handle the full trash-out for landlords and property-preservation companies in the CSRA, top to bottom. Tell us about the job and we'll confirm scope and price before any work begins.",
    leadService: "junk-removal",
    serviceType: "Tenant Trash-Out Service",
    keywords: [
      "tenant trash out",
      "eviction cleanout",
      "post eviction trash out",
      "REO trash out",
      "property preservation cleanout",
    ],
    pricing: { note: "Heavier and dirtier than a standard cleanout; quoted after photos or a walkthrough." },
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
        a: "Send a few photos or a walkthrough video and we'll size the job and get you a firm quote. We confirm scope and price with you before any work begins.",
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
      "Renovations and demolition generate debris fast — drywall, torn-out flooring, old cabinets, fixtures, and lumber. We work with contractors and DIY remodelers around Augusta to haul it off, in a single pickup or throughout a project. Request a free quote and we'll confirm scope and price before any work begins.",
    leadService: "junk-removal",
    serviceType: "Construction & Renovation Debris Removal",
    keywords: [
      "renovation debris removal",
      "construction debris removal",
      "demo debris haul away",
      "remodel junk removal",
      "contractor debris pickup",
    ],
    pricing: { note: "Heavier loads (tile, plaster, countertops) priced by weight and volume." },
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
      `Renovation and demo debris removal in ${city}, ${state}. We haul drywall, flooring, cabinets, and construction waste so your crew keeps moving. Free quote — photos welcome.`,
    overview: (city) =>
      `Renovation debris removal takes the mess demolition leaves behind — drywall, plaster, torn-out flooring and tile, old cabinets and countertops, fixtures, lumber, and trim — and hauls it off your ${city} job site. We can do a single post-demo haul or recurring pickups over the course of a project.`,
  },
  {
    slug: "carpet-removal",
    label: "Carpet Removal",
    shortLabel: "carpet removal",
    blurb: "Pull old carpet, padding, and tack strips and leave a clean subfloor.",
    hubIntro:
      "Before new flooring goes in — or after pet or water damage — old carpet has to come out. We help homeowners and property managers in the Augusta area remove the carpet, padding, and tack strips and haul it all away. Request a free quote and we'll confirm scope and price before any work begins.",
    leadService: "junk-removal",
    serviceType: "Carpet Removal & Haul-Away",
    keywords: [
      "carpet removal",
      "carpet haul away",
      "old carpet disposal",
      "carpet tear out",
      "carpet and pad removal",
    ],
    pricing: { note: "Usually priced by number and size of rooms, plus stairs." },
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
      "An overgrown lot or neglected yard can get out of hand fast, especially on a vacant or inherited property. We help owners across the CSRA cut back the grass, brush, vines, and saplings and haul off what's cleared. Have a code-enforcement deadline? Tell us and we'll work to it, confirming scope and price before any work begins.",
    leadService: "landscaping",
    serviceType: "Overgrown Lot & Property Cleanup",
    keywords: [
      "overgrown property cleanup",
      "overgrown lot clearing",
      "brush and weed removal",
      "vacant lot cleanup",
      "property overgrowth removal",
    ],
    pricing: { note: "Depends on lot size and how long it's been left; scoped from photos or a visit." },
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
      "When a playset, trampoline, shed, or old pool has outlived its use, taking it apart is a weekend you'd rather skip. We help homeowners in the Augusta area with the teardown and haul every piece away. Request a free quote and we'll confirm scope and price before any work begins.",
    leadService: "junk-removal",
    serviceType: "Playset & Outdoor Structure Removal",
    keywords: [
      "playset removal",
      "swing set removal",
      "trampoline removal",
      "shed removal",
      "above ground pool removal",
    ],
    pricing: { note: "We handle the teardown; priced by structure size and haul volume." },
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
