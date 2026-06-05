import type { Service, AdFormat, Tone, GraphicCopy } from "./types";

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
    "Junk Piling Up? Get a Free Quote in Minutes",
    "Junk Removal in Augusta — Same Day Available",
    "Got Junk? Local Haulers in the CSRA Are Ready",
    "Same-Day Junk Removal in Evans, Martinez & Augusta, GA",
    "Estate Cleanout? Garage Full? Request a Free Quote Online",
    "Furniture, Appliances, Debris — Local Pros Take It All",
    "Clean Out Your Space Before the Weekend",
    "Don't Let That Junk Sit Another Day — Get a Quote Now",
    "Local Junk Removal You Can Count On — Serving the CSRA",
    "Weekend Junk Removal Special — Limited Slots Available",
  ],
  landscaping: [
    "Keep Your Lawn Looking Sharp All Season Long",
    "Lawn Care in Augusta — Weekly & One-Time Service Available",
    "Your Neighbors Will Notice the Difference",
    "Professional Lawn Service in Columbia County & Augusta",
    "Mowing, Edging, Trimming — Done Right Every Time",
    "Book Your Lawn Cut Before the Weekend",
    "Affordable Lawn Care You Can Count On",
    "Your Lawn, Done Right — Serving the Augusta Area",
    "First Service Deal — New Customers in Augusta & CSRA",
    "Lawn Looking Rough? Get It Fixed This Week",
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
    "Overgrown Yard? Get It Fixed Fast",
    "Full Yard Cleanups in Augusta & the CSRA",
    "One-Time Yard Cleanup — Transform Your Property in a Day",
    "Reclaim Your Yard — Local Pros Ready in Augusta",
    "Yard Cleanup Special — Augusta, Evans & Surrounding Areas",
    "That Overgrown Mess? Gone by End of Day",
    "One-Time Yard Rescue — No Long-Term Contract Required",
    "Yard Cleanup & Haul Away — Everything Included",
  ],
  "leaf-removal": [
    "Leaves Taking Over? Get Them Cleared Fast",
    "Fall Leaf Cleanup in Augusta & Surrounding Areas",
    "Tired of Raking? Local Pros Will Handle It",
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
      "Tired of staring at that old furniture or pile of junk taking up space? Connect with local haulers in Augusta who take it all away — furniture, appliances, yard waste, and more. Same-day slots often available. Upload a few photos online and get a free quote in minutes.",
      "Spring (or fall, or any season) cleaning got out of hand? Don't sweat it — local service providers in the Augusta area handle pickups and haul-away for anything you don't want. Couches, mattresses, old appliances, construction debris — nothing too big or too small. Get a free quote online.",
      "Moving out? Cleaning out a parent's house? Just sick of the clutter? Request a quote for a full cleanout — garage, attic, whole property. Local providers in the Augusta area handle the sorting, hauling, and everything in between. Same-day availability, honest pricing. Request a free estimate — photo uploads help get you an accurate price fast.",
      "One visit clears it all. Old furniture, broken appliances, yard waste, junk piles — request a free quote and get connected with local haulers serving Augusta, Columbia County, North Augusta, and the CSRA. Takes about two minutes online.",
      "Stop tripping over junk. Whether it's one piece of furniture or a full garage worth of stuff, local pros in the Augusta area are ready to help. Flat-rate pricing, no surprise fees. Submit photos online for the most accurate quote — or text us if you need same-day.",
    ],
    craigslist: [
      "LOCAL JUNK REMOVAL — SAME DAY OFTEN AVAILABLE\n\nServices include:\n✓ Old furniture & mattresses\n✓ Appliances (washers, dryers, fridges, TVs)\n✓ Yard waste & debris\n✓ Garage & attic cleanouts\n✓ Estate cleanouts\n✓ Construction debris\n\nServing Augusta, Evans, Martinez, Grovetown, North Augusta & more\n\nFair prices. No hidden fees. Request a free quote online — upload photos for fast, accurate pricing.",
      "JUNK HAULING — AUGUSTA & CSRA\n\nNeed stuff gone fast? Local haulers in the Augusta area handle it all. Couches, appliances, junk piles, old sheds — nothing too big.\n\nWhat to expect:\n— Same-day and weekend availability\n— Honest upfront pricing\n— All heavy lifting handled\n\nAreas served: Augusta, Evans, Martinez, Grovetown, Columbia County, North Augusta, Aiken\n\nRequest a free estimate on our website. For same-day jobs, text is fastest.",
      "FULL-SERVICE JUNK REMOVAL — AUGUSTA AREA\n\nFrom single-item pickups to full property cleanouts.\n\nWill take:\n• Furniture of all kinds\n• Appliances (working or not)\n• Mattresses & box springs\n• Exercise equipment\n• Hot tubs (yes, really)\n• Construction debris\n• Yard waste\n• Pretty much anything\n\nFast, fair, and local. Same-day slots available most days.\n\nGet a free no-obligation quote online — upload photos for the most accurate pricing.",
    ],
    nextdoor: [
      "Hey neighbors! Sharing this for anyone dealing with junk buildup or a cleanout in the Augusta or Columbia County area. Esee Property Services connects homeowners with local haulers — furniture, appliances, debris, you name it. Same-day availability often possible. Request a free quote on our website — you can upload photos too.",
      "Just wanted to share a local service with the neighborhood — Esee Property Services helps folks in Augusta, Evans, Martinez, and surrounding areas get connected with local junk removal providers. Got stuff piling up or need a garage/attic cleared out? Fast quotes, fair pricing, no job too small. Request a free quote online or message me directly.",
      "Neighbors — heading into cleanup season and need to get rid of junk, old furniture, or debris? Esee Property Services connects Augusta-area homeowners with local haulers. Same-day and next-day availability often possible. Head to our website to request a free quote and upload a couple photos.",
    ],
    "promo-blurb": [
      "This weekend only — $25 off any junk removal job in Augusta & the CSRA. Get your quote online.",
      "Garage cleanout special: book this week and save. Request your free estimate online.",
      "Limited same-day slots available today. First-come, first-served. Submit your quote request online — or text us if it's urgent.",
      "New customer deal — book your first junk removal and get a discount. Request a quote online, Augusta area only.",
      "End-of-month push: open slots available this week. Best pricing of the season. Get your quote in online now.",
      "Got junk? Slots open this weekend in the Augusta area. Special rate — request your quote online.",
    ],
    headline: [
      "Same-Day Junk Removal — Augusta, GA",
      "Local Haulers — Flat Rate, No Surprises",
      "Clear Out Your Space Today — Request a Quote",
      "Augusta Junk Removal — Fast, Fair, Local",
      "Book Your Haul This Weekend — Slots Available",
    ],
    cta: [
      "Upload photos and get a free quote online — fast, no pressure",
      "Request your free estimate online — you'll get a response same day",
      "Get a fast quote online — takes about 2 minutes",
      "Submit photos for an accurate free quote online",
      "Request your quote online — or text us if you need same-day service",
    ],
  },
  landscaping: {
    facebook: [
      "Don't let your lawn be the eyesore on the block. Get matched with local lawn care professionals serving Augusta, Evans, Martinez, and all of Columbia County — mowing, edging, trimming, cleanups, and more. Request a free quote online.",
      "Lawn care doesn't have to be a hassle. Get connected with local providers who handle mowing, edging, trimming, and cleanup — every time, on schedule. Just a clean yard you can be proud of. Serving the Augusta area. Request a free quote online.",
      "Your yard is the first thing people see when they pull up. Local lawn care providers in Augusta keep it looking sharp — mowing, edging, blowing, and more. Reliable service at fair prices. Get a free quote online.",
      "Tired of your lawn looking rough, or tired of spending your weekends mowing? Get connected with local lawn care providers serving Augusta, Evans, Martinez, and Grovetown. Competitive rates, consistent results. Request a quote on our website today.",
    ],
    craigslist: [
      "LAWN CARE SERVICES — AUGUSTA & COLUMBIA COUNTY\n\nServices available:\n✓ Mowing & edging\n✓ String trimming\n✓ Blowing & cleanup\n✓ Hedge & shrub trimming\n✓ Flower bed maintenance\n✓ One-time & recurring plans\n\nReliable local service at competitive rates.\n\nServing: Augusta, Evans, Martinez, Grovetown, North Augusta\n\nRequest a free estimate online — upload photos of your lawn for the most accurate quote.",
      "LAWN MAINTENANCE — WEEKLY, BI-WEEKLY, ONE-TIME — AUGUSTA AREA\n\nLooking for lawn care you can count on? Local providers show up when scheduled and do the job right.\n\nServices include:\n• Full mow, edge, and blow\n• Shrub and hedge trimming\n• Cleanups\n• Overseeding\n• Seasonal prep\n\nCompetitive local pricing. No contracts required for one-time service.\n\nAreas covered: All of Augusta, Columbia County, North Augusta, Aiken.\n\nRequest a free quote online to get started.",
    ],
    nextdoor: [
      "Hey everyone — just reaching out to neighbors in the area. Esee Property Services connects local homeowners with lawn care providers. If you're looking for reliable mowing, edging, and cleanup at a fair price — request a free quote on our website, or feel free to message me.",
      "Neighborhood shoutout! If you need lawn care help in the Augusta or Columbia County area, we connect homeowners with local providers. Weekly and bi-weekly plans available, plus one-time cleanups. Request a quote online or send me a message.",
    ],
    "promo-blurb": [
      "First service half off for new customers in the Augusta area this month. Request a quote online.",
      "Weekly lawn care available in Augusta, Evans, Martinez. No contracts. Get a quote online.",
      "End-of-month lawn cleanup special — book before slots fill. Request yours online.",
      "First-time customer deal this week. Augusta-area homeowners — request online.",
      "Referral bonus: send us a customer, get $10 off your next service.",
    ],
    headline: [
      "Lawn Care That Actually Shows Up — Augusta, GA",
      "Professional Mowing & Edging in Columbia County",
      "Reliable Weekly Lawn Service — Evans, Martinez, Augusta",
      "Your Lawn, Done Right — Local Pros",
      "First Service Deal — New Customers in Augusta & CSRA",
    ],
    cta: [
      "Request a free quote online — get on the schedule this week",
      "Get a quote online before available slots fill up",
      "Submit your info online for pricing — no commitment required",
      "Request your free estimate online — ask about our new customer discount",
      "Get a quote online in about 2 minutes — easy, no hassle",
    ],
  },
  "seasonal-cleanup": {
    facebook: [
      "Season's changing and your yard is showing it. Don't let the mess pile up heading into the holidays. Request a one-time seasonal cleanup quote — trimming, hauling, debris removal, bed cleanup — whatever your yard needs to look its best. Augusta and surrounding areas. Request a free quote online this week.",
      "Before the holidays hit, get your yard looking sharp. Seasonal cleanup services are available for homeowners across the Augusta area — leaves, debris, overgrowth, dead plants, you name it. One visit, big difference. Request your cleanup quote online — upload photos for an accurate estimate.",
      "The end of the season is a great time to reset your yard. Debris cleanup, bed clearing, trimming, and haul-away — one flat visit, done right. Available in Augusta, Evans, Martinez, Grovetown, and surrounding areas. Get a free estimate online.",
    ],
    craigslist: [
      "SEASONAL YARD CLEANUP — AUGUSTA & CSRA\n\nEnd-of-season cleanups for homeowners and rental properties.\n\nServices include:\n✓ Debris removal\n✓ Leaf & mulch cleanup\n✓ Dead plant removal\n✓ Bed edging & cleanup\n✓ Overgrowth trimming\n✓ Haul-away included\n\nFlat-rate pricing, no surprises. Available weekdays and weekends.\n\nServing all of Augusta, Columbia County, Aiken, North Augusta.\n\nRequest a free estimate online — upload a couple photos for accurate pricing.",
    ],
    nextdoor: [
      "Neighbors — heading into the season change and looking to get your yard cleaned up? Esee Property Services helps Augusta and Columbia County homeowners connect with local cleanup providers. Debris removal, trimming, haul-away — one visit makes a big difference. Request a free quote on our website, or message me if you have questions!",
    ],
    "promo-blurb": [
      "Seasonal cleanup special — book this week, save $20. Request your quote online.",
      "Get your yard ready before the holidays. Same-week booking available — request online.",
      "One-time seasonal cleanup — flat rate, all haul-away included. Get a quote online.",
      "Limited cleanup slots this weekend. Augusta, Evans & Martinez. Request your slot online.",
    ],
    headline: [
      "Seasonal Yard Cleanup — Augusta & CSRA",
      "End-of-Season Cleanup Before the Holidays",
      "One-Time Cleanup — Big Difference, Done Fast",
      "Get Your Property Ready for the Season",
    ],
    cta: [
      "Get a free estimate online — upload photos for the most accurate quote",
      "Request your cleanup online before this weekend's slots fill up",
      "Submit your quote request online — one-time service, no contract",
      "Get a free quote online in minutes — or text us if you need same-day",
    ],
  },
  "yard-cleanup": {
    facebook: [
      "Has your yard gotten away from you? Overgrowth, debris, dead patches — happens to the best of us. One visit, dramatic difference. Local providers serving Augusta, Evans, Martinez, and surrounding areas. Get a free quote online — upload a few photos for accurate pricing.",
      "One-time yard cleanups are available for Augusta-area homeowners. Whether it's overgrowth that got out of hand, a property you inherited, or just a yard that needs a reset — local service providers are ready to help. Fast turnaround, fair pricing. Augusta and CSRA. Request a free quote on our website.",
      "Before-and-after yard transformations in the Augusta area. If your yard needs serious attention — cleared out, hauled, and looking completely different — request a free estimate online and upload photos for accurate pricing.",
    ],
    craigslist: [
      "ONE-TIME YARD CLEANUP — AUGUSTA & SURROUNDING AREAS\n\nYard gotten out of control? Full one-time cleanups are available.\n\nIncludes:\n✓ Debris removal\n✓ Overgrowth cutting & trimming\n✓ Haul-away of all waste\n✓ Edging & cleanup\n\nResidential and rental properties. Same-week availability.\n\nFlat rate pricing — know what you're paying upfront.\n\nAugusta, Evans, Martinez, Grovetown, Columbia County, North Augusta.\n\nRequest a free estimate online — photo uploads help with accurate quoting.",
    ],
    nextdoor: [
      "Hey neighbors! If your yard has gotten a bit out of hand and you need a one-time cleanup — Esee Property Services connects homeowners in the Augusta area with local providers who handle cleanup and haul-away. No long-term commitment, fair pricing. Request a free quote on our website, or message me directly.",
    ],
    "promo-blurb": [
      "Yard cleanup special this week — flat rate, haul-away included. Request your quote online.",
      "Rental property cleanup available — request a quote online.",
      "One-time yard reset — available same week. Request online, Evans, Martinez & Augusta.",
      "Weekend special: full yard cleanup + haul-away. Limited slots — request yours online.",
    ],
    headline: [
      "Full Yard Cleanup — Augusta, GA",
      "One-Time Yard Reset — Done in a Day",
      "Overgrowth Cleared, Debris Hauled — Local Pros",
      "Yard Cleanup Special in Columbia County & Augusta",
    ],
    cta: [
      "Upload photos and get a free quote online — same-week slots available",
      "Request a free estimate online — you'll get a response fast",
      "Get your quote online in minutes — or text if you need same-day",
      "Submit photos online for accurate pricing — no commitment required",
    ],
  },
  "leaf-removal": {
    facebook: [
      "Leaves are piling up and raking season is not fun. Skip the raking — local pros in Augusta will clear, bag, and haul away every last leaf so your lawn can breathe again. Same-day and weekend slots available. Request a free quote online.",
      "Don't let a thick layer of leaves smother your lawn heading into the season. Fast leaf removal and haul-away is available across the Augusta area. Flat rate pricing, all cleanup included. Request a free quote online before slots fill.",
      "Leaf season in Augusta is no joke. If you'd rather spend your weekend doing literally anything else — local pros are ready to help. Full leaf removal, cleanup, and haul-away for homes across Evans, Martinez, Augusta, and Columbia County. Get a free quote online.",
    ],
    craigslist: [
      "LEAF REMOVAL & CLEANUP — AUGUSTA & CSRA\n\nFall leaf removal for homeowners across the Augusta area.\n\nWhat's included:\n✓ Full leaf clearing (front, back, sides)\n✓ Bagging or blowing to curb\n✓ Haul-away available\n✓ Cleanup of beds and edges\n\nFast, affordable, and local. Same-day availability some days.\n\nServing: Augusta, Evans, Martinez, Grovetown, North Augusta, Aiken\n\nGet a free quote online — upload a photo of your yard for accurate pricing. For same-day needs, text is fastest.",
    ],
    nextdoor: [
      "Hey neighbors! Leaf season is here and Esee Property Services is connecting homeowners across Augusta and Columbia County with local leaf removal providers. If you'd rather skip the raking, request a free quote on our website — or just message me!",
      "Checking in with the neighborhood — local leaf removal is available in this area right now through Esee Property Services. Get matched with someone who'll clear, bag, and haul. Fair local pricing. Request a quote online anytime.",
    ],
    "promo-blurb": [
      "Fall leaf removal special — flat rate, haul included. Request your quote online before the weekend fills.",
      "Leaf cleanup + haul-away this weekend — Augusta, Evans, Martinez. Limited slots — request online.",
      "Tired of raking? It can be handled same-day. Get a quote online or text us.",
      "Leaf removal deal: mention this post and save $15. Request online, Augusta area only.",
    ],
    headline: [
      "Fall Leaf Removal — Augusta & CSRA",
      "Done Raking? Local Pros Will Handle It",
      "Leaf Cleanup & Haul-Away — Same Day Available",
      "Keep Your Lawn Healthy — Book Leaf Removal Today",
    ],
    cta: [
      "Upload a photo and get a free quote online — same-day often available",
      "Request your leaf removal quote online before weekend slots fill up",
      "Get a free quote online in minutes — or text us for same-day service",
      "Submit your quote request online — fast, free, no pressure",
    ],
  },
};

export const CTAS: Record<Tone, string[]> = {
  friendly: [
    "Get a free quote online — takes about two minutes and you can upload photos!",
    "Head to our website to request a free estimate — you'll get a response fast.",
    "Request your free quote online — upload a couple photos for the most accurate pricing.",
    "Super easy — fill out a quick quote form on our website and we'll take it from there.",
  ],
  urgent: [
    "Limited slots this week — request your quote online before they're gone.",
    "Don't wait — get your quote in online today before this weekend fills up.",
    "Spots are filling fast — submit your quote request online now.",
    "Request online now to lock in your slot — or text us if you need same-day.",
  ],
  professional: [
    "Request a complimentary estimate online — photo uploads welcome for precise pricing.",
    "Submit your quote request on our website — submissions are reviewed same day.",
    "Get a free online estimate — upload photos for the most accurate quote.",
    "Start your estimate online — fast, no obligation, quick response.",
  ],
  casual: [
    "Just hop on our website and fill out a quick quote form — takes like 2 minutes.",
    "Get a quote online real quick — or text us if it's a same-day thing.",
    "Fill out a quick quote form on our site — easy.",
    "Hit up our website for a fast free quote — you can throw photos on there too.",
  ],
  neighborhood: [
    "Request a quote on our website — you can upload photos and I'll get back to you quick.",
    "Easy way is to go through our website — free quote, upload photos, no pressure.",
    "Request online and I'll get back to you same day — or message me if it's urgent.",
    "Fill out a quick quote form on the website — totally free, takes two minutes.",
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

// Short location lines for graphic overlays — bullet-separated city names
export const GRAPHIC_LOCATION_LINES = [
  "AUGUSTA • EVANS • GROVETOWN • AIKEN",
  "AUGUSTA • MARTINEZ • NORTH AUGUSTA",
  "EVANS • GROVETOWN • COLUMBIA COUNTY",
  "AUGUSTA • COLUMBIA COUNTY • AIKEN",
];

// Short, punchy copy for social media graphics — hook uses \n for line break
export const GRAPHIC_COPY: Record<Service, GraphicCopy[]> = {
  "junk-removal": [
    { hook: "GARAGE\nTOO FULL?", valueProp: "LOCAL PROS READY", ctaBadge: "FREE QUOTES" },
    { hook: "JUNK\nPILING UP?", valueProp: "FAST LOCAL SERVICE", ctaBadge: "SAME DAY AVAILABLE" },
    { hook: "ESTATE\nCLEANOUT?", valueProp: "HANDLED START TO FINISH", ctaBadge: "FREE ESTIMATES" },
    { hook: "MOVING\nOUT?", valueProp: "ANYTHING HAULED AWAY", ctaBadge: "SAME DAY SERVICE" },
    { hook: "FULL\nHOUSE?", valueProp: "ONE CALL, DONE", ctaBadge: "FREE QUOTES" },
  ],
  landscaping: [
    { hook: "OVERGROWN\nYARD?", valueProp: "GET YOUR WEEKENDS BACK", ctaBadge: "FREE ESTIMATES" },
    { hook: "LAWN\nLOOKS ROUGH?", valueProp: "FIXED FAST", ctaBadge: "FREE QUOTES" },
    { hook: "TIRED OF\nMOWING?", valueProp: "GET IT COVERED", ctaBadge: "FREE ESTIMATES" },
    { hook: "YARD OUT\nOF HAND?", valueProp: "SHARP RESULTS", ctaBadge: "FREE QUOTES" },
  ],
  "seasonal-cleanup": [
    { hook: "YARD\nA MESS?", valueProp: "ONE VISIT FIXES IT", ctaBadge: "FREE ESTIMATES" },
    { hook: "END OF\nSEASON?", valueProp: "GETS CLEANED UP", ctaBadge: "FREE QUOTES" },
  ],
  "yard-cleanup": [
    { hook: "YARD\nOVERGROWN?", valueProp: "CLEARED OUT FAST", ctaBadge: "FREE QUOTES" },
    { hook: "PROPERTY\nA MESS?", valueProp: "TRANSFORMED IN A DAY", ctaBadge: "FREE ESTIMATES" },
  ],
  "leaf-removal": [
    { hook: "LEAVES\nPILING UP?", valueProp: "CLEARED OUT FAST", ctaBadge: "FREE QUOTES" },
    { hook: "DONE\nRAKING?", valueProp: "DONE FOR YOU", ctaBadge: "SAME DAY AVAILABLE" },
  ],
};
