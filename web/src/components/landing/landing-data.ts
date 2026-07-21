/**
 * Editorial content for the Premium landing page — verbatim from the
 * "StayLens Premium" Claude Design handoff (single source of truth).
 */

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export type HeroSlide = {
  name: string;
  heading: string;
  sub: string;
  price: string;
  rating: string;
  img: string;
  seed: string;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    name: "Maldives",
    heading: "Where the Ocean Meets Serenity",
    sub: "Private overwater villas suspended above turquoise lagoons.",
    price: "$1,290",
    rating: "4.98",
    img: u("1573843981267-be1999ff37cd", 1920),
    seed: "maldives",
  },
  {
    name: "Santorini",
    heading: "Sunsets Carved in White & Blue",
    sub: "Cliffside retreats above the endless Aegean caldera.",
    price: "$980",
    rating: "4.95",
    img: u("1570077188670-e3a8d69ac5ff", 1920),
    seed: "santorini",
  },
  {
    name: "Swiss Alps",
    heading: "Above the Clouds, Below the Stars",
    sub: "Alpine chalets wrapped in silence, pine and snow.",
    price: "$1,540",
    rating: "4.99",
    img: u("1531366936337-7c912a4589a7", 1920),
    seed: "alps",
  },
  {
    name: "Bali",
    heading: "Jungle Luxury, Reimagined",
    sub: "Open-air villas veiled in emerald rice terraces.",
    price: "$620",
    rating: "4.92",
    img: u("1537996194471-e657df975ab4", 1920),
    seed: "bali",
  },
  {
    name: "Kyoto",
    heading: "Stillness, in Every Season",
    sub: "Machiya sanctuaries among ancient temple gardens.",
    price: "$740",
    rating: "4.97",
    img: u("1545569341-9eb8b30979d9", 1920),
    seed: "kyoto",
  },
  {
    name: "Tuscany",
    heading: "Golden Hours, Endless Vineyards",
    sub: "Restored estates beneath the warm Val d’Orcia sun.",
    price: "$860",
    rating: "4.96",
    img: u("1523906834658-6e24ef2386f9", 1920),
    seed: "tuscany",
  },
];

export type Collection = { name: string; count: number; img: string; query: string };

export const COLLECTIONS: Collection[] = [
  { name: "Luxury Villas", count: 2140, img: u("1613490493576-7fde63acd811"), query: "luxury villa" },
  { name: "Beachfront", count: 1860, img: u("1507525428034-b723cf961d3e"), query: "beachfront" },
  { name: "Treehouses", count: 420, img: u("1520250497591-112f2f40a3f4"), query: "treehouse" },
  { name: "Cabins", count: 1310, img: u("1449158743715-0a90ebb6d2d8"), query: "cabin" },
  { name: "Mountain Retreats", count: 980, img: u("1502784444187-359ac186c5bb"), query: "mountain retreat" },
  { name: "Tiny Homes", count: 640, img: u("1523217582562-09d0def993a6"), query: "tiny home" },
  { name: "Private Islands", count: 96, img: u("1439066615861-d1af74d74000"), query: "private island" },
  { name: "Lake Houses", count: 750, img: u("1439066290691-510066268af5"), query: "lake house" },
];

export type Testimonial = {
  name: string;
  role: string;
  quote: string;
  stayNum: string;
  img: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Sofia Marchetti",
    role: "Traveler · Milan",
    quote:
      "StayLens found a villa I could never have described in a search box. It simply understood the kind of quiet I was after.",
    stayNum: "24",
    img: u("1544005313-94ddf0286df2"),
  },
  {
    name: "James Okafor",
    role: "Photographer · London",
    quote:
      "Every recommendation felt hand-picked. The AI match scores were uncannily right — three trips, three perfect homes.",
    stayNum: "31",
    img: u("1500648767791-00dcc994a43e"),
  },
  {
    name: "Aiko Tanaka",
    role: "Designer · Tokyo",
    quote:
      "The most beautiful booking experience I’ve ever used. It feels less like a website and more like a private concierge.",
    stayNum: "18",
    img: u("1494790108377-be9c29b29330"),
  },
  {
    name: "Daniel Reyes",
    role: "Founder · Lisbon",
    quote:
      "From a single sentence to an infinity-pool villa under budget in under a minute. This is how travel should feel.",
    stayNum: "42",
    img: u("1507003211169-0a1dd7228f2d"),
  },
];

export type Stat = { target: number; prefix: string; suffix: string; label: string };

export const STATS: Stat[] = [
  { target: 100000, prefix: "", suffix: "+", label: "Verified Homes" },
  { target: 150, prefix: "", suffix: "+", label: "Countries" },
  { target: 98, prefix: "", suffix: "%", label: "Happy Guests" },
  { target: 4.9, prefix: "", suffix: "★", label: "Average Rating" },
];

export type MapMarker = {
  name: string;
  stays: string;
  rating: string;
  x: string;
  y: string;
  delay: string;
};

export const MAP_MARKERS: MapMarker[] = [
  { name: "Maldives", stays: "2.1k", rating: "4.9", x: "70%", y: "62%", delay: "0s" },
  { name: "Santorini", stays: "860", rating: "4.9", x: "54%", y: "40%", delay: ".4s" },
  { name: "Swiss Alps", stays: "1.2k", rating: "5.0", x: "50%", y: "32%", delay: ".8s" },
  { name: "Bali", stays: "1.6k", rating: "4.8", x: "80%", y: "66%", delay: "1.2s" },
  { name: "Kyoto", stays: "940", rating: "4.9", x: "85%", y: "38%", delay: "1.6s" },
  { name: "Tuscany", stays: "1.1k", rating: "4.9", x: "51%", y: "35%", delay: "2s" },
  { name: "Iceland", stays: "520", rating: "4.9", x: "46%", y: "22%", delay: "2.4s" },
];

export const MAP_ARCS: string[] = [
  "M480 160 Q 560 60 700 310",
  "M480 160 Q 640 120 800 330",
  "M480 160 Q 620 30 850 190",
  "M700 310 Q 760 200 800 330",
  "M460 110 Q 500 40 480 160",
];

export const AI_TEXT =
  "I want a quiet beachfront villa with an infinity pool under $300.";

export const AI_RECS = [
  { name: "Azure Reef", loc: "Maldives", match: "98%", price: "$290", x: "-6%", y: "6%", d: "6s", delay: "0s", img: u("1602002418082-a4443e081dd1", 200) },
  { name: "Lagoon House", loc: "Bali", match: "95%", price: "$260", x: "56%", y: "42%", d: "7s", delay: ".8s", img: u("1537996194471-e657df975ab4", 200) },
  { name: "Coral Bungalow", loc: "Phuket", match: "93%", price: "$240", x: "10%", y: "72%", d: "6.5s", delay: "1.4s", img: u("1596436889106-be35e843f974", 200) },
];

export const CTA_IMG = u("1464822759023-fed622ff2c3b", 1920);

/** shared palette (from the design) */
export const LP = {
  cream: "#f8f6f1",
  creamAlt: "#f0efe8",
  ink: "#16241d",
  inkSoft: "#5b6b62",
  deep: "#0d201a",
  deepMid: "#122e24",
  green: "#205c46",
  greenBright: "#1e4c3a",
  gold: "#c9a24b",
  goldSoft: "#e6c778",
} as const;
