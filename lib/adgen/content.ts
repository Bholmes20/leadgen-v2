import type { Service, AdFormat, Tone } from "./types";

export const LOCATIONS = [
  "Augusta",
  "Evans",
  "Martinez",
  "Grovetown",
  "Harlem",
  "North Augusta",
  "Aiken",
  "Columbia County",
  "Richmond County",
  "the CSRA",
  "Augusta and surrounding areas",
  "Evans and Martinez",
  "the Augusta metro",
];

export const HEADLINES: Record<Service, string[]> = {
  "junk-removal": [
    "Junk Piling Up? We Haul It Away — Same Day Available",
    "Augusta's Reliable Junk Haulers — Fair Prices, No Hidden Fees",
    "Got Junk? We've Got Trucks — Serving Augusta & the CSRA",
    "Same-Day Junk Removal in Evans, Martinez & Augusta, GA",
    "Estate Cleanout? Garage Full? We'll Clear It Out Fast",
    "Furniture, Appliances, Debris — We Take It All",
    "Clean Out Your Space Before the Weekend",
    "Don't Let That Junk Sit Another Day — We're Ready Now",
    "Local Junk Haulers You Can Trust — Serving the CSRA",
    "Weekend Junk Removal Special — Limited Slots Available",
  ],
  landscaping: [
    "Keep Your Lawn Looking Sharp All Season Long",
    "Augusta's Dependable Lawn Care — Weekly & One-Time Service",
    "Your Neighbors Will Notice the Difference",
    "Professional Lawn Service in Columbia County & Augusta",
    "Mowing, Edging, Trimming — Done Right Every Time",
    "Book Your Lawn Cut Before the Weekend",
    "Affordable Lawn Care You Can Count On",
    "Your Lawn, Our Pride — Serving the Augusta Area",
    "First Cut Deal — New Customers Get Discounted First Service",
    "Lawn Looking Rough? We Fix That — Same Week Available",
  ],
  "seasonal-cleanup": [
    "Don't Let Your Yard Go Into the Next Season Looking Like This",
    "Seasonal Cleanup — Heavy Lifting Done For You",
    "End-of-Season Yard Cleanup — Book Before Slots Fill Up",
    "Get Your Property Ready for the Season Change",
    "One-Time Seasonal Cleanup — Augusta & the CSRA",
    "Holiday Season Coming — Get Your Yard in Order Now",
    "Before & After Seasonal Yard Work in the Augusta Area",
    "Seasonal Yard Cleanup Starting at Just $99",
  ],
  "yard-cleanup": [
    "Overgrown Yard? We Can Fix That — Fast",
    "Full Yard Cleanups in Augusta & the CSRA",
    "One-Time Yard Cleanup — Transform Your Property in a Day",
    "Reclaim Your Yard — Local Crew Ready to Roll",
    "Yard Cleanup Special — Augusta, Evans & Surrounding Areas",
    "That Overgrown Mess? Gone by End of Day",
    "One-Time Yard Rescue — No Long-Term Contract Required",
    "Yard Cleanup & Haul Away — Everything Included",
  ],
  "leaf-removal": [
    "Leaves Taking Over? We'll Clear Them Fast",
    "Fall Leaf Cleanup in Augusta & Surrounding Areas",
    "Tired of Raking? Let Us Handle It",
    "Leaf Removal Service — Augusta, Evans, Martinez & More",
    "Same-Day Leaf Haul Available in Columbia County",
    "Fall Cleanup Special — Leaves Bagged & Hauled Away",
    "Don't Let Leaves Kill Your Lawn — Book Removal Today",
    "Leaf Removal + Cleanup — Done Right, Done Fast",
  ],
};

export const BODIES: Record<Service, Record<AdFormat, string[]>> = {
  "junk-removal": {
    facebook: [
      "Tired of staring at that old furniture or pile of junk taking up space? We haul it all away — furniture, appliances, yard waste, and more. Serving Augusta, Evans, Martinez, and the whole CSRA. Same-day slots usually available. Text or call for a free quote!",
      "Spring (or fall, or any season) cleaning got out of hand? Don't sweat it — we pick up and haul away anything you don't want. Couches, mattresses, old appliances, construction debris — nothing too big or too small. Fast, friendly, and priced fair.",
      "Moving out? Cleaning out a parent's house? Just sick of the clutter? We do full cleanouts — garage, attic, whole property. We sort, haul, and handle everything. Local crew, same-day availability, honest pricing. Hit us up for a quick estimate!",
      "One call clears it all. We haul away old furniture, broken appliances, yard waste, junk piles — you name it. No job too big or too small. We serve all of Augusta, Columbia County, North Augusta, and the CSRA. Weekend appointments available!",
      "Stop tripping over junk. Whether it's one piece of furniture or a full garage worth of stuff, we've got a truck and a crew ready to go. Fair flat-rate pricing, no surprise fees. Available same day in most cases — call or text for a fast quote.",
    ],
    craigslist: [
      "LOCAL JUNK REMOVAL — SAME DAY OFTEN AVAILABLE\n\nWe haul away:\n✓ Old furniture & mattresses\n✓ Appliances (washers, dryers, fridges, TVs)\n✓ Yard waste & debris\n✓ Garage & attic cleanouts\n✓ Estate cleanouts\n✓ Construction debris\n\nServing Augusta, Evans, Martinez, Grovetown, North Augusta & more\n\nFair prices. No hidden fees. Text for a quick quote.",
      "JUNK HAULING — AUGUSTA & CSRA\n\nNeed stuff gone fast? We load, haul, and dispose of it all. Couches, appliances, junk piles, old sheds — nothing too big.\n\nWhy us?\n— Local, licensed, and insured\n— Same-day and weekend availability\n— Honest upfront pricing\n— We do all the heavy lifting\n\nAreas served: Augusta, Evans, Martinez, Grovetown, Columbia County, North Augusta, Aiken\n\nText or call for a fast free estimate.",
      "FULL-SERVICE JUNK REMOVAL — AUGUSTA AREA\n\nFrom single-item pickups to full property cleanouts, we handle it all.\n\nWe take:\n• Furniture of all kinds\n• Appliances (working or not)\n• Mattresses & box springs\n• Exercise equipment\n• Hot tubs (yes, really)\n• Construction debris\n• Yard waste\n• Pretty much anything\n\nLocal, fast, and fair. Same-day slots available most days.\n\nCall or text for a no-obligation quote.",
    ],
    nextdoor: [
      "Hey neighbors! If you're dealing with junk buildup, old furniture, or just need a cleanout in the Augusta or Columbia County area — we're local and can usually come out same or next day. We haul away furniture, appliances, debris — you name it. Honest pricing and we treat your property with care. Happy to give a free estimate. Feel free to message me!",
      "Just wanted to introduce ourselves to the neighborhood — we do local junk removal and hauling for folks in Augusta, Evans, Martinez, and the surrounding area. If you've got stuff piling up or need a garage/attic cleared out, we're fast, friendly, and priced fair. No job too small! Send me a message or give us a call anytime.",
      "Neighbors — heading into cleanup season and need to get rid of junk, old furniture, or debris? We're a local crew serving this area and can usually get out same day or next day. We take care of all the heavy lifting and disposal. Reach out if you want a free quote!",
    ],
    "promo-blurb": [
      "This weekend only — $25 off any junk removal job in Augusta & the CSRA. Text for details.",
      "Garage cleanout special: book this week and save. Local haul crew ready to go.",
      "Limited same-day slots available today. First-come, first-served. Text now.",
      "New customer deal — book your first junk removal and get a discount. Augusta area only.",
      "End-of-month push: we have open truck slots to fill. Best pricing of the season. Call now.",
      "Got junk? We've got a truck and time this weekend. Special rate for Augusta-area jobs booked today.",
    ],
    headline: [
      "Same-Day Junk Removal — Augusta, GA",
      "We Haul Anything — Flat Rate, No Surprises",
      "Clear Out Your Space Today — Local Crew Ready",
      "Augusta Junk Removal — Fast, Fair, Local",
      "Book Your Haul This Weekend — Slots Available",
    ],
    cta: [
      "Text us for a free quote — most jobs booked same or next day",
      "Call or text now — we'll give you a price in minutes",
      "Message us anytime — free estimates, no pressure",
      "Book your slot before the weekend fills up",
      "Reply with your address for a fast free estimate",
    ],
  },
  landscaping: {
    facebook: [
      "Don't let your lawn be the eyesore on the block. We offer mowing, edging, trimming, cleanups, and more. Serving Augusta, Evans, Martinez, and all of Columbia County. Book your first cut this week and see the difference a professional makes.",
      "Lawn care doesn't have to be a hassle. We handle mowing, edging, trimming, and cleanup — every time, on schedule. No flaking, no excuses. Just a clean yard you can be proud of. Serving the Augusta area. Ask about our weekly and bi-weekly plans!",
      "Your yard is the first thing people see when they pull up. We make sure it looks sharp. Full-service lawn care in Augusta and surrounding areas — mowing, edging, blowing, and more. Reliable, affordable, and locally owned. Text to get scheduled.",
      "If you're tired of your lawn looking rough, or tired of spending your weekends mowing — we can help. Local lawn care service in Augusta, Evans, Martinez, Grovetown. Competitive rates, consistent quality. First-time customers get a deal. Reach out today!",
    ],
    craigslist: [
      "PROFESSIONAL LAWN CARE — AUGUSTA & COLUMBIA COUNTY\n\nServices offered:\n✓ Mowing & edging\n✓ String trimming\n✓ Blowing & cleanup\n✓ Hedge & shrub trimming\n✓ Flower bed maintenance\n✓ One-time & recurring plans\n\nReliable, licensed, and locally operated. Competitive rates.\n\nServing: Augusta, Evans, Martinez, Grovetown, North Augusta\n\nText or call for a free estimate.",
      "LAWN MAINTENANCE — WEEKLY, BI-WEEKLY, ONE-TIME — AUGUSTA AREA\n\nLooking for a lawn crew you can count on? We show up when we say we will and do the job right.\n\nWhat we do:\n• Full mow, edge, and blow\n• Shrub and hedge trimming\n• Cleanups\n• Overseeding\n• Seasonal prep\n\nCompetitive local pricing. No contracts required for one-time service.\n\nAreas covered: All of Augusta, Columbia County, North Augusta, Aiken.\n\nCall or text to schedule.",
    ],
    nextdoor: [
      "Hey everyone — just wanted to reach out to neighbors in the area. We offer local lawn care services and have some availability opening up. If you're looking for reliable mowing, edging, and cleanup — done consistently and at a fair price — we'd love to earn your business. Feel free to message for a free quote!",
      "Neighborhood shoutout! If you need lawn care help in the Augusta or Columbia County area, we're local and available. Weekly and bi-weekly plans available, plus one-time cleanups. We're reliable — you won't have to chase us down. Send me a message if interested!",
    ],
    "promo-blurb": [
      "First lawn cut half off for new customers in the Augusta area this month.",
      "Weekly lawn care starting at $X/month — Augusta, Evans, Martinez. No contracts.",
      "End-of-month lawn cleanup special — book before slots fill.",
      "Free edge trim with your first mow this week. Augusta-area customers only.",
      "Referral bonus: send us a customer, get $10 off your next service.",
    ],
    headline: [
      "Lawn Care That Actually Shows Up — Augusta, GA",
      "Professional Mowing & Edging in Columbia County",
      "Reliable Weekly Lawn Service — Evans, Martinez, Augusta",
      "Your Lawn, Done Right — Local Crew",
      "First Cut Deal — New Customers in Augusta & CSRA",
    ],
    cta: [
      "Text for a free quote — we'll get you on the schedule this week",
      "Call now to book before our schedule fills up",
      "Message us for pricing — no commitment required",
      "Ask about our new customer discount",
      "Book online or text — easy, fast, no hassle",
    ],
  },
  "seasonal-cleanup": {
    facebook: [
      "Season's changing and your yard is showing it. Don't let the mess pile up heading into the holidays. We do one-time seasonal cleanups — trimming, hauling, debris removal, bed cleanup — whatever your yard needs to look its best. Augusta and surrounding areas. Book this week!",
      "Before the holidays hit, get your yard looking sharp. We offer seasonal cleanup services for homeowners across the Augusta area — leaves, debris, overgrowth, dead plants, you name it. One visit, big difference. Text to schedule your cleanup this week.",
      "The end of the season is a great time to reset your yard. We handle all of it — debris cleanup, bed clearing, trimming, and haul-away. One flat visit, done right. Serving Augusta, Evans, Martinez, Grovetown, and surrounding areas. Ask us about availability!",
    ],
    craigslist: [
      "SEASONAL YARD CLEANUP — AUGUSTA & CSRA\n\nEnd-of-season cleanups for homeowners and rental properties.\n\nWe handle:\n✓ Debris removal\n✓ Leaf & mulch cleanup\n✓ Dead plant removal\n✓ Bed edging & cleanup\n✓ Overgrowth trimming\n✓ Haul-away included\n\nFlat-rate pricing, no surprises. Available weekdays and weekends.\n\nServing all of Augusta, Columbia County, Aiken, North Augusta.\n\nText for a free estimate.",
    ],
    nextdoor: [
      "Neighbors — heading into the season change and looking to get your yard cleaned up? We offer one-time seasonal cleanups across the Augusta and Columbia County area. We clear out the debris, trim things back, and haul everything away. It makes a big difference heading into the next season. Send me a message if you want a free quote!",
    ],
    "promo-blurb": [
      "Seasonal cleanup special — book this week, save $20. Augusta area.",
      "Get your yard ready before the holidays. Same-week booking available.",
      "One-time seasonal cleanup — flat rate, all haul-away included. Call now.",
      "Limited cleanup slots this weekend. Augusta, Evans & Martinez. Book fast.",
    ],
    headline: [
      "Seasonal Yard Cleanup — Augusta & CSRA",
      "End-of-Season Cleanup Before the Holidays",
      "One-Time Cleanup — Big Difference, Done Fast",
      "Get Your Property Ready for the Season",
    ],
    cta: [
      "Text for a free estimate — one-time, no contract",
      "Book before this weekend's slots fill up",
      "Message us for availability — we're booking fast",
      "Call or text for a flat-rate quote",
    ],
  },
  "yard-cleanup": {
    facebook: [
      "Has your yard gotten away from you? Overgrowth, debris, dead patches — happens to the best of us. We come in, clean it all up, and haul everything away. One visit, dramatic difference. Serving Augusta, Evans, Martinez, and surrounding areas. Text for a quick quote!",
      "One-time yard cleanups are our specialty. Whether it's overgrowth that got out of hand, a property you inherited, or just a yard that needs a reset — we've got you. Local crew, fast turnaround, fair pricing. Augusta and CSRA. Hit us up!",
      "We love a good yard transformation. Before and afters are our favorite. If your yard needs some serious love, we'll clear it out, haul everything, and leave it looking completely different. Augusta-area homeowners — text us today for a free estimate.",
    ],
    craigslist: [
      "ONE-TIME YARD CLEANUP — AUGUSTA & SURROUNDING AREAS\n\nYard gotten out of control? We do full one-time cleanups.\n\nIncludes:\n✓ Debris removal\n✓ Overgrowth cutting & trimming\n✓ Haul-away of all waste\n✓ Edging & cleanup\n\nResidential and rental properties. Same-week availability.\n\nFlat rate pricing — know what you're paying upfront.\n\nAugusta, Evans, Martinez, Grovetown, Columbia County, North Augusta.\n\nText or call for a free estimate.",
    ],
    nextdoor: [
      "Hey neighbors! If your yard has gotten a bit out of hand and you need a one-time cleanup — we're local and can usually get there same or next day. We'll clear the debris, trim back the overgrowth, and haul it all away. No long-term commitment, just a good honest cleanup. Message me for a free quote!",
    ],
    "promo-blurb": [
      "Yard cleanup special this week — flat rate, haul-away included. Augusta area.",
      "Rental property cleanup — we work with landlords and property managers.",
      "One-time yard reset — available same week. Evans, Martinez & Augusta.",
      "Weekend special: full yard cleanup + haul-away. Limited slots. Book now.",
    ],
    headline: [
      "Full Yard Cleanup — Augusta, GA",
      "One-Time Yard Reset — Done in a Day",
      "Overgrowth Cleared, Debris Hauled — Local Crew",
      "Yard Cleanup Special in Columbia County & Augusta",
    ],
    cta: [
      "Text for a free estimate — same-week slots available",
      "Call us today — we can usually get out same or next day",
      "Message us your address for a fast quote",
      "Book your cleanup before the weekend",
    ],
  },
  "leaf-removal": {
    facebook: [
      "Leaves are piling up and raking season is not fun. Let us handle it — we'll clear, bag, and haul away every last leaf so your lawn can breathe again. Serving Augusta, Evans, Martinez, Grovetown, and the rest of the CSRA. Same-day and weekend slots available!",
      "Don't let a thick layer of leaves smother your lawn heading into the season. We offer fast leaf removal and haul-away across the Augusta area. Flat rate pricing, all cleanup included. Text us to get on the schedule before slots fill!",
      "Leaf season in Augusta is no joke. If you'd rather spend your weekend doing literally anything else — we're here for it. Full leaf removal, cleanup, and haul-away for homes across Evans, Martinez, Augusta, and Columbia County. Book now!",
    ],
    craigslist: [
      "LEAF REMOVAL & CLEANUP — AUGUSTA & CSRA\n\nFall leaf removal for homeowners across the Augusta area.\n\nWhat's included:\n✓ Full leaf clearing (front, back, sides)\n✓ Bagging or blowing to curb\n✓ Haul-away available\n✓ Cleanup of beds and edges\n\nFast, affordable, and local. Same-day availability some days.\n\nServing: Augusta, Evans, Martinez, Grovetown, North Augusta, Aiken\n\nText for a quick free quote.",
    ],
    nextdoor: [
      "Hey neighbors! Leaf season is here and we're doing leaf removal and cleanup across the Augusta and Columbia County area. If you'd rather skip the raking, we'll clear everything and haul it away at a fair flat rate. Usually same-day or next-day available. Shoot me a message if you want a quote!",
      "Checking in with the neighborhood — leaf removal going on right now in this area if anyone's interested. We clear, bag, and haul. Super quick visit, big difference. Fair local pricing. Message me anytime!",
    ],
    "promo-blurb": [
      "Fall leaf removal special — flat rate, haul included. Book before weekend fills.",
      "Leaf cleanup + haul-away this weekend — Augusta, Evans, Martinez. Limited slots.",
      "Tired of raking? We'll handle it. Same-day available today.",
      "Leaf removal deal: mention this post and save $15. Augusta area only.",
    ],
    headline: [
      "Fall Leaf Removal — Augusta & CSRA",
      "Done Raking Yet? We'll Do It For You",
      "Leaf Cleanup & Haul-Away — Same Day Available",
      "Keep Your Lawn Healthy — Book Leaf Removal Today",
    ],
    cta: [
      "Text for a free quote — same-day often available",
      "Call now before the weekend slots fill up",
      "Message us to book your leaf cleanup this week",
      "Reply with your zip code for a fast estimate",
    ],
  },
};

export const CTAS: Record<Tone, string[]> = {
  friendly: [
    "Text us anytime — we love helping neighbors out!",
    "Give us a shout and we'll get you a free estimate, no pressure.",
    "We're local and we'd love to earn your business. Reach out!",
    "Message us today — happy to chat about your project.",
  ],
  urgent: [
    "Limited slots available — book before they're gone!",
    "This offer expires at end of week. Call or text NOW.",
    "Same-day slots are filling fast — don't wait.",
    "Only a few openings left this weekend. Text NOW to reserve yours.",
    "Don't wait on this — prices go up next month.",
  ],
  professional: [
    "Contact us today for a complimentary estimate.",
    "Schedule your service online or call during business hours.",
    "We offer free consultations for all projects. Reach out to learn more.",
    "Our team is standing by — call or text for a no-obligation quote.",
  ],
  casual: [
    "Just text us — we'll figure out the rest.",
    "Shoot us a message, we'll get back to you fast.",
    "Hit us up whenever — we're usually pretty quick to respond.",
    "Easy — text your address and we'll get you a price.",
  ],
  neighborhood: [
    "Feel free to message me directly — happy to help neighbors out.",
    "Just shoot me a DM or text and we'll set something up.",
    "I'm local and usually can get there quick. Just reach out!",
    "Neighbors always get a fair deal. Message me anytime.",
  ],
};

export const URGENCY_PHRASES = [
  "Limited availability this week.",
  "Weekend slots are almost full.",
  "Same-day service available today.",
  "Book by Friday for weekend service.",
  "Only a few spots left.",
  "Filling up fast — book now.",
  "Special rate expires Sunday.",
  "This weekend only.",
];

export const SOCIAL_PROOF = [
  "Trusted by homeowners across the Augusta area.",
  "Hundreds of happy customers in Columbia County.",
  "Locally owned and operated right here in Augusta.",
  "5-star rated by your neighbors.",
  "Family-owned business serving the CSRA.",
];
