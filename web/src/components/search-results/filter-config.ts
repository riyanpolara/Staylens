import {
  AirVent,
  Car,
  CookingPot,
  KeyRound,
  PawPrint,
  Tv,
  WashingMachine,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/** Quick amenity pills → real amenity slugs. Shared by the desktop
 *  FiltersBar and the mobile MobileFilters so the set stays in sync. */
export const QUICK_FILTERS: { slug: string; label: string; icon: LucideIcon }[] = [
  { slug: "wifi", label: "Wifi", icon: Wifi },
  { slug: "washer", label: "Washing machine", icon: WashingMachine },
  { slug: "tv", label: "TV", icon: Tv },
  { slug: "free-parking-on-premises", label: "Free parking", icon: Car },
  { slug: "air-conditioning", label: "Air conditioning", icon: AirVent },
  { slug: "kitchen", label: "Kitchen", icon: CookingPot },
  { slug: "pets-allowed", label: "Allows pets", icon: PawPrint },
  { slug: "pool", label: "Pool", icon: Waves },
  { slug: "self-check-in", label: "Self check-in", icon: KeyRound },
];

/** URL keys owned by the Filters modal — counted on the Filters button. */
export const MODAL_KEYS = ["price", "type", "beds", "bath", "ptype", "fav", "luxe"];
