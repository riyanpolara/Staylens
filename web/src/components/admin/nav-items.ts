/**
 * Sidebar navigation. The built screens route to real pages; the rest resolve to
 * the shared stub screen (handoff spec: "The other sidebar entries route to an
 * empty-state stub").
 */
export type AdminNavItem = {
  href: string;
  label: string;
  /** lucide-react icon name, resolved in Sidebar */
  icon: string;
  badge?: number;
  built: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard", built: true },
  { href: "/admin/properties", label: "Properties", icon: "Building2", built: true },
  { href: "/admin/bookings", label: "Bookings", icon: "CalendarCheck", badge: 12, built: true },
  { href: "/admin/users", label: "Users", icon: "Users", built: true },
  { href: "/admin/ai-search", label: "AI Search", icon: "Sparkles", built: true },
  { href: "/admin/hosts", label: "Hosts", icon: "BadgeCheck", built: false },
  { href: "/admin/reviews", label: "Reviews", icon: "Star", built: true },
  { href: "/admin/revenue", label: "Revenue", icon: "TrendingUp", built: true },
  { href: "/admin/payouts", label: "Payouts", icon: "Wallet", built: false },
  { href: "/admin/messages", label: "Messages", icon: "MessageSquare", badge: 3, built: false },
  { href: "/admin/reports", label: "Reports", icon: "FileBarChart", built: false },
  { href: "/admin/moderation", label: "Moderation", icon: "ShieldAlert", built: false },
  { href: "/admin/audit-log", label: "Audit log", icon: "ScrollText", built: false },
  { href: "/admin/settings", label: "Settings", icon: "Settings", built: false },
];
