import {
  AirVent,
  Baby,
  Bath,
  Bed,
  Building2,
  Car,
  ChefHat,
  Coffee,
  Dumbbell,
  Flame,
  Refrigerator,
  Shield,
  Shirt,
  Snowflake,
  Sparkles,
  Trees,
  Tv,
  Utensils,
  Waves,
  Wifi,
  Wind,
  type LucideIcon,
} from "lucide-react";

/** Keyword → icon, matched against the amenity slug/name (first hit wins). */
const RULES: { test: RegExp; icon: LucideIcon }[] = [
  { test: /wifi|internet|ethernet/, icon: Wifi },
  { test: /tv|cable|hdtv/, icon: Tv },
  { test: /pool|hot tub/, icon: Waves },
  { test: /kitchen|cooking|oven|stove|dishes/, icon: Utensils },
  { test: /chef|breakfast/, icon: ChefHat },
  { test: /coffee|nespresso/, icon: Coffee },
  { test: /refriger|fridge|freezer/, icon: Refrigerator },
  { test: /air.?condition|\bac\b/, icon: AirVent },
  { test: /heat|fireplace|indoor fire/, icon: Flame },
  { test: /washer|dryer|laundry/, icon: Shirt },
  { test: /hair.?dry/, icon: Wind },
  { test: /parking|garage|carport/, icon: Car },
  { test: /gym|exercise|fitness/, icon: Dumbbell },
  { test: /garden|backyard|patio|nature|outdoor/, icon: Trees },
  { test: /crib|baby|children|family|kid/, icon: Baby },
  { test: /bath|shampoo|bathtub|toiletr/, icon: Bath },
  { test: /bed|linen|pillow|mattress/, icon: Bed },
  { test: /elevator|building|doorman/, icon: Building2 },
  { test: /smoke|carbon|fire ext|first aid|security|lock|safe/, icon: Shield },
  { test: /snow|ski|winter/, icon: Snowflake },
];

export function amenityIcon(slugOrName: string): LucideIcon {
  const key = slugOrName.toLowerCase();
  for (const r of RULES) if (r.test.test(key)) return r.icon;
  return Sparkles;
}
