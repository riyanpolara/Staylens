/**
 * Placeholder content for the Explore screen — copied verbatim from the
 * Stitch "Staylens: Explore" design (single source of truth). Swapped for
 * live Supabase data in a later milestone.
 */

export type Stay = {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  image: string;
  imageAlt: string;
  /** bento grid emphasis — the lead card spans 2 columns */
  featured?: boolean;
};

export type Destination = {
  id: string;
  title: string;
  /** image tile, or a solid brand tile when image is omitted (per design) */
  image?: string;
  imageAlt?: string;
  tileLabel?: string;
};

export type Experience = {
  id: string;
  category: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

export type BrandValue = {
  id: string;
  icon: "shield" | "payments" | "leaf";
  title: string;
  description: string;
};

const img = (path: string) => `https://lh3.googleusercontent.com/${path}`;

export const NAV_LINKS = [
  { label: "Explore", href: "#", active: true },
  { label: "Wishlist", href: "#" },
  { label: "Trips", href: "#" },
  { label: "Host", href: "#" },
];

export const CATEGORIES = [
  { id: "cabins", label: "Cabins", icon: "cabin" },
  { id: "villas", label: "Villas", icon: "villa" },
  { id: "beachfront", label: "Beachfront", icon: "beach" },
  { id: "mountains", label: "Mountain Views", icon: "mountain" },
  { id: "lakeside", label: "Lakeside", icon: "lake" },
  { id: "design", label: "Design Icons", icon: "design" },
  { id: "eco", label: "Eco Retreats", icon: "eco" },
  { id: "urban", label: "Urban Luxe", icon: "city" },
] as const;

export const STAYS: Stay[] = [
  {
    id: "tuscany-vineyard-villa",
    name: "Tuscany Vineyard Villa",
    location: "Chianti Region, Italy",
    price: 850,
    rating: 4.98,
    featured: true,
    image: img(
      "aida/AP1WRLv9DTC1VwHru6lbJZcOD9-8awv5YYiSnFR7k9SH3Foa_3C1yjZ3Mu03t8NvgM_caNX5OQQ-t29Dg-qWo0xWswkXXznoXdz5bnhzlCP7hFiwHp7cPJpw6uEucfl-brZlMSraRUGB09nk7ITQHbL59JXxCQfClRDLNgelXOKJOhtOMnC-_ghAMRwuwIoq-7tr4lTrqJuuMgnXWlVVue-1ZGdE5HBZtoXSNWLWS4b-EZQx_UdGLcjKDLH0cYhk",
    ),
    imageAlt:
      "Historic stone villa in Tuscany surrounded by golden vineyards at sunset",
  },
  {
    id: "eiffel-vista-suite",
    name: "Eiffel Vista Suite",
    location: "7th Arrondissement, Paris",
    price: 1200,
    rating: 5.0,
    image: img(
      "aida/AP1WRLtWy4ld1aRXa5OPI25Kz9hhPsMFkw6imetIwFFurUvpE92fRnjdYYjA9xFOweXYw1VUvlVjKfX9HrqUBs0Lg-xxumLagzTTRwHc_bYzbtpDbyhiywoFIf3oWhX8_zp4quceqbWOxYb1621L3TISmialQjU1TAvAB8VpmgaS0pUyXVy_f5f1vTLxNoaHFBjklFN795w1M61V_lahN5iWnkcXl-qHZKNXO2EiHc7kdK_Bu0Qi8Q05DCNvoXrt",
    ),
    imageAlt:
      "Haussmann-style Paris street at sunset with the Eiffel Tower in the distance",
  },
  {
    id: "marina-penthouse",
    name: "Marina Penthouse",
    location: "Dubai Marina, UAE",
    price: 2450,
    rating: 4.95,
    image: img(
      "aida/AP1WRLu1L-Zs47oTStqx7t1KGBbPeaa7XBHE41LnqK-uUPvE7pSz7zEz19scFL2_yq2k_o03mVlS4uA9uA1BsUA0O8N-4UkUHO84OiSzTuwCJJFomG8-YVsFKcw7O8BmPqRKqGjVAL_dBmfINWWS7F9iZkAisdw7w7jSeCnQ-UgKoAc6RttmekFwo0F770v0qG3tEIr6-_9LTWetITi2YgRgo1lUdMdqWsm_yuGwkA6OGZqibyQ_stuDVPshiNvs",
    ),
    imageAlt: "Dubai Marina skyline at twilight with the Burj Khalifa",
  },
];

export const DESTINATIONS: Destination[] = [
  {
    id: "london",
    title: "London Charm",
    image: img(
      "aida/AP1WRLtgSdQ3HqPkRnP2Nu2O7aOf1HvGrN0myeIEgYZwQhwCCqacDedyD9mTaFwH3Hinz4yc5U7Ky71QkZ_1E3n450MzKbYNKL_tRZU-msbl4hWLFir-mk4YNI7L1Srn1WM31zqNop7YXPCaMAcGESvxdMNx40QzYHHU_lNPS6aZ60caSEXG0k9zH421UQiTlOobeWIEqbjwrK6pu2P5njU13ay6CIDmdoAhu02o9ErfzO3EePpXPoZ77LM8CoaY",
    ),
    imageAlt: "Tower Bridge illuminated at night over the River Thames",
  },
  {
    id: "swiss-alps",
    title: "Mountain Hideouts",
    tileLabel: "Swiss Alps",
  },
  {
    id: "bali",
    title: "Bali Jungles",
    image: img(
      "aida/AP1WRLuIBNf9qFneO1cv2-52fqabfkRzspKo0CStqztyBySFcino2hvk1w8ZHk0bR1KrmNURUMocLJyt6Y6ugn50uPfnks_k3wjfB_04f6nZWn0B24hBcA6qBSTljqg96nnif5t9miXyVGuhd-i16Qs8U8tPVZm5S5oVq1eZZV69W8Rla5NiOLafknVYUVsPuYyW44rzAf3Usca06AqbhuFobgWniuoviiwSXPAkgukrLSCQkzdH4Tx0QhqZ2sHR",
    ),
    imageAlt: "Misty tropical jungle valley in Bali with coconut palms",
  },
  {
    id: "tuscany",
    title: "Tuscany Hills",
    image: img(
      "aida/AP1WRLv9DTC1VwHru6lbJZcOD9-8awv5YYiSnFR7k9SH3Foa_3C1yjZ3Mu03t8NvgM_caNX5OQQ-t29Dg-qWo0xWswkXXznoXdz5bnhzlCP7hFiwHp7cPJpw6uEucfl-brZlMSraRUGB09nk7ITQHbL59JXxCQfClRDLNgelXOKJOhtOMnC-_ghAMRwuwIoq-7tr4lTrqJuuMgnXWlVVue-1ZGdE5HBZtoXSNWLWS4b-EZQx_UdGLcjKDLH0cYhk",
    ),
    imageAlt: "Rolling Tuscan hills with cypress trees at golden sunset",
  },
];

export const EXPERIENCES: Experience[] = [
  {
    id: "lake-sailing",
    category: "Nautical",
    title: "Private Lake Sailing",
    description:
      "Exclusive sunrise cruise on Lake Como with private chef service.",
    image: img(
      "aida/AP1WRLuhUeqbz0R2u9Sok03y57X4T6XaxWe-RVslSsw2MdqDC3XxWEnXcPXtwXECPRv4YGtR81-VDpQu_BGG2bPewXgslSlsvaKG3hpVBfpKMEb9SvmZniYYCcQTLBpui-MY6Rsot10yDQsyZ_SDBZWYjDIiejnhiUTaT1hucMHiLJ8hh_ahAKWAsMBW_ac7SNFkHor8aNvwxlzMa4Fc3qDHKobAuOiumESdz0E4T8dxd5nMZ5oxohaq9pBN7fQ",
    ),
    imageAlt: "Classic sailboat gliding across Lake Como",
  },
  {
    id: "jazz-tour",
    category: "Culture",
    title: "Secret Jazz Tour",
    description:
      "Enter the hidden speakeasies of New Orleans with a local musician guide.",
    image: img(
      "aida/AP1WRLsOYorz719dWg3cdvjVSuhogA9ZIqUGXFT8VzUgI3xj6QZrF6aEajkC62CiN12Vee4_qBqUMMhNDqGlx6kca4LZtxqlY9H9qtI91BLhU0c5BNFQ2e17YZZBBQ_9Cpi2HX2Uu9c3iMhxyZLgItZ-hZ_0Kye86A5auoOilAbHjg0D9Zc9XdmgII0l7i4O8tr72LjeMlBmynuFhDg8GpU4rN9wsGVsSFmFSaPK96LskPVUS99crC8K1-cMX1U",
    ),
    imageAlt: "Saxophonist silhouetted against amber stage light in a jazz club",
  },
  {
    id: "oaxaca-kitchen",
    category: "Gastronomy",
    title: "The Oaxaca Kitchen",
    description:
      "Master the art of mole with a Michelin-vetted local chef in her private garden.",
    image: img(
      "aida/AP1WRLvUpoW44yfREZvkT4xa25klmv_0MieGdDBQildVlwfCNXf9JsW0bdKUXnl1oCDQQUr1pmXuOAq6uH-U7Ww8WAfvK10eDL5gQyWxhek9oGrUJKo_NmBAV1QXIjLYdPLr7o9mGAGBR5WtCF1Oee1qVujmLNqwhr2yVjbGwkolSz8unO4O3rMb1KsIEsMr2inSMGV8c_oHoKjE9mNSHQDbibqWvKgmLKXk7p_WgG8-7NmZ6IJj0JuQPHiBRlI",
    ),
    imageAlt: "Traditional Oaxacan kitchen with vibrant pottery",
  },
];

export const BRAND_VALUES: BrandValue[] = [
  {
    id: "vetted",
    icon: "shield",
    title: "Vetted Professionals",
    description:
      "Every stay is inspected and certified by our global network of architecture and hospitality experts.",
  },
  {
    id: "pricing",
    icon: "payments",
    title: "Transparent Pricing",
    description:
      "No hidden service fees. What you see is what you pay, including premium insurance and 24/7 concierge.",
  },
  {
    id: "nature",
    icon: "leaf",
    title: "Nature First",
    description:
      "We prioritize properties that demonstrate regenerative practices and architectural harmony with nature.",
  },
];

export const HERO = {
  badge: "NATURE LUXE COLLECTION",
  titleLead: "Find Sanctuary in the ",
  titleAccent: "Wilderness.",
  subtitle:
    "Curated architectural wonders settled in Earth's most breathtaking landscapes. High-end hospitality meets environmental serenity.",
  images: [
    {
      src: img(
        "aida/AP1WRLuIBNf9qFneO1cv2-52fqabfkRzspKo0CStqztyBySFcino2hvk1w8ZHk0bR1KrmNURUMocLJyt6Y6ugn50uPfnks_k3wjfB_04f6nZWn0B24hBcA6qBSTljqg96nnif5t9miXyVGuhd-i16Qs8U8tPVZm5S5oVq1eZZV69W8Rla5NiOLafknVYUVsPuYyW44rzAf3Usca06AqbhuFobgWniuoviiwSXPAkgukrLSCQkzdH4Tx0QhqZ2sHR",
      ),
      alt: "Luxury Balinese villa overlooking a misty tropical valley at dawn",
    },
    {
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBeoWlAw6MoPxcwF5Xql1VUMEe-IGr5Ew7kkfcem3riFYyAsJWc3Kn9EoR_Ol-8p6qkoUuyzBgmBCvqSNSKUAFeMIG1tKiLbD9-uzXaDthVZNH3WMBMhlYb44Tir4lafASuoENtwoqdCNs2t1rlLRKoFtgCLKh12mqywStutBY4K088pZWvyADCQ43RI3iHjaKJT5GOe-pGc2PZpiXZ_k8n5mGUwffc3K3ef725WAPeLmQAbjY_hBPZxGLNDAwMtJCtTZg",
      alt: "Ultra-modern glass cabin reflecting a serene mountain landscape",
    },
  ],
};

export const HOST_BANNER = {
  title: "Share your sanctuary.",
  subtitle:
    "Turn your architectural gem into a world-class destination. Join our exclusive circle of luxury hosts.",
  cta: "List your property",
  image: img(
    "aida/AP1WRLtL9EbvzfzwJK8X-IYeUpcGS8P2I5j5bbVec6Tfc4hmPz3sCeGjlf16CAX4AlFYGCFs7aw1gugKeGWKoS4URs44B5e_IfNeKUMSC2z8vgfmbyvE42cM174vynvMjlCzCu8eldMKKhQ0MBK_psbZNJce5Phzbsx2p5FjTfKAiAj1wBBrwpZalJ6lip9rBnYA3VEf6tCgKtlMEXUS_EOFPRnOkvnIQotJjUgPhD-WNbgdxvSVGwHoU6uI69s",
  ),
  imageAlt: "Sunlit Parisian artist's atelier with large industrial windows",
};

export const FOOTER_LINKS = {
  explore: ["Nature Stays", "Experiences", "Luxe Destinations", "Gift Cards"],
  support: [
    "Help Center",
    "Safety Information",
    "Cancellation Options",
    "Our COVID-19 Response",
  ],
};

export const AVATAR_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDBy_g1q_fTNVUhzMug39ID9n9KpadX1ghOCwqNYDMDtJ6AV3XXNxH-b5LSEZyd77EUE_UD6bgld7nICoZAXoSgeXL0Jz32f3kZv_oH3jz_FfAnAYybryK_A16FfDkgdHYultIa1BMV3G-MstWh9_XDw93vggRgdv6qY8KNHQFKmyfBOVP3G9XP9_ql2bSo0dIjJYyELrtQHX829o4r6OVCz2djvgWbVqMYSjdyBxSRFyYnxIeEJF2Qxw";
