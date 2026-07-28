"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { ADMIN_NAV } from "@/components/admin/nav-items";
import { useMediaQuery } from "@/components/admin/use-media-query";

/**
 * Admin chrome: sidebar + sticky header + <main>. Owns theme and rail state.
 *
 * Layout behaviour from the handoff spec:
 *   - sidebar 236px expanded / 76px icon-only
 *   - auto-collapses to the rail below 1024px
 *   - becomes an overlay drawer below 900px
 *   - header search hidden below 1180px
 */

function Icon({ name, ...props }: { name: string } & Icons.LucideProps) {
  const C = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <C {...props} />;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  /** null = follow the viewport; true/false = user overrode via the toggle. */
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Viewport is external state, so it's read (not copied into state) — this
  // keeps the rail/drawer behaviour from the prototype without any effect sync.
  const isRail = useMediaQuery("(max-width: 1023px)");
  const isMobile = useMediaQuery("(max-width: 899px)");
  const collapsed = manualCollapsed ?? isRail;

  // Closing the drawer/popover is driven by the click that navigates, not by a
  // pathname effect — same result, no setState-in-effect.
  function closeOverlays() {
    setDrawerOpen(false);
    setNotifOpen(false);
  }

  const current = ADMIN_NAV.find(
    (n) => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href)),
  );
  const railW = isMobile ? 236 : collapsed ? 76 : 236;
  const showLabels = isMobile ? true : !collapsed;

  return (
    <div className="admin-shell">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {isMobile && drawerOpen && (
        <button
          aria-label="Close navigation"
          className="admin-scrim"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className="admin-sidebar"
        data-drawer={isMobile ? (drawerOpen ? "open" : "closed") : undefined}
        style={{ width: railW }}
      >
        <div className="admin-brand">
          <Icons.TreePine aria-hidden size={24} style={{ color: "var(--color-accent)" }} />
          {showLabels && <span className="admin-brand-name">StayLens</span>}
        </div>

        <nav aria-label="Admin" className="admin-nav">
          {ADMIN_NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="admin-nav-item"
                data-active={active || undefined}
                title={showLabels ? undefined : item.label}
                onClick={closeOverlays}
              >
                <Icon name={item.icon} size={19} aria-hidden />
                {showLabels && <span className="admin-nav-label">{item.label}</span>}
                {showLabels && item.badge ? (
                  <span className="tag tag-accent admin-nav-badge">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="admin-main" style={{ marginInlineStart: isMobile ? 0 : railW }}>
        <header className="admin-header">
          <button
            type="button"
            className="btn btn-icon"
            aria-label={isMobile ? "Open navigation" : "Toggle sidebar"}
            onClick={() =>
              isMobile ? setDrawerOpen((v) => !v) : setManualCollapsed(!collapsed)
            }
          >
            <Icons.Menu size={18} aria-hidden />
          </button>

          <div className="admin-crumb">
            <span className="text-muted">Admin</span>
            <Icons.ChevronRight size={14} aria-hidden className="text-muted" />
            <h1 className="admin-title">{current?.label ?? "Dashboard"}</h1>
          </div>

          <div className="admin-header-actions">
            <label className="admin-search field">
              <Icons.Search size={16} aria-hidden />
              <input
                className="input"
                type="search"
                placeholder="Search admin…"
                aria-label="Search admin"
              />
            </label>

            <button
              type="button"
              className="btn btn-icon"
              aria-label="Toggle dark mode"
              aria-pressed={dark}
              onClick={() => setDark((v) => !v)}
            >
              {dark ? <Icons.Sun size={18} aria-hidden /> : <Icons.Moon size={18} aria-hidden />}
            </button>

            <div className="admin-notif-wrap">
              <button
                type="button"
                className="btn btn-icon"
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Icons.Bell size={18} aria-hidden />
                <span className="admin-notif-dot" aria-hidden />
              </button>
              {notifOpen && (
                <>
                  <button
                    className="admin-popover-scrim"
                    aria-label="Close notifications"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="card elev-lg admin-notif-panel" role="dialog" aria-label="Notifications">
                    <p className="card-kicker">Notifications</p>
                    <ul className="admin-notif-list">
                      <li><strong>New booking · SL-48210</strong><span className="text-muted">Cliffside Olive House · 4m ago</span></li>
                      <li><strong>Property submitted</strong><span className="text-muted">Fjord Glass Cabin · 22m ago</span></li>
                      <li><strong>Host verified</strong><span className="text-muted">Marta Oliveira · 1h ago</span></li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            <span className="admin-avatar" aria-label="Signed in as admin">R</span>
          </div>
        </header>

        {/* id matches the root layout's skip link target */}
        <main id="main-content" className="admin-content">{children}</main>
      </div>

      {/* theme override target for the whole subtree */}
      <ThemeSync dark={dark} />
    </div>
  );
}

/** Applies `data-theme` to the admin scope root (token override, per the spec). */
function ThemeSync({ dark }: { dark: boolean }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".admin-scope");
    if (root) root.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  return null;
}
