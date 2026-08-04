"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  Compass,
  Globe,
  Heart,
  HelpCircle,
  House,
  LayoutDashboard,
  Menu,
  MessageSquare,
  CircleUser,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/use-auth";
import { signOutAction } from "@/app/(auth)/actions";

/**
 * Airbnb-style account menu: a "Become a host" link, a globe (guest) that
 * becomes a profile avatar once signed in, and a hamburger that opens a
 * dropdown whose contents depend on the auth state. Backed by real Supabase
 * Auth via useAuth().
 */
export function UserMenu({ light = false }: { light?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, initial, displayName, avatarUrl, isAdmin } = useAuth();
  const authed = !!user;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await signOutAction();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2 shrink-0">
      <a
        href="#"
        className={cn(
          "hidden lg:block text-sm font-semibold px-4 py-2 rounded-full transition-colors duration-300",
          light
            ? "text-white drop-shadow-md hover:bg-white/10"
            : "text-on-surface hover:bg-surface-container-low",
        )}
      >
        Become a host
      </a>

      {authed ? (
        // Straight to the profile, not the dropdown. The hamburger beside it
        // still opens the menu, so nothing becomes unreachable — and an avatar
        // that goes to your profile is what the shape leads people to expect.
        <Link
          href="/profile/edit"
          aria-label={displayName ? `${displayName} — your profile` : "Your profile"}
          className="w-10 h-10 rounded-full overflow-hidden bg-primary-fixed text-on-primary-fixed-variant font-bold flex items-center justify-center hover:scale-105 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="w-full h-full object-cover"
            />
          ) : (
            initial
          )}
        </Link>
      ) : (
        <button
          type="button"
          aria-label="Choose a language and region"
          className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Globe aria-hidden className="size-5 text-on-surface" strokeWidth={1.8} />
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Main menu"
        className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Menu aria-hidden className="size-5 text-on-surface" strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            role="menu"
            aria-label="Account menu"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.21, 0.65, 0.36, 1] }}
            className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] max-h-[min(80vh,640px)] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-tinted-lg border border-outline-variant/20 py-2 z-[70]"
          >
            {authed ? (
              <AuthedItems
                onLogout={handleLogout}
                onNavigate={() => setOpen(false)}
                isAdmin={isAdmin}
              />
            ) : (
              <GuestItems onNavigate={() => setOpen(false)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GuestItems({ onNavigate }: { onNavigate: () => void }) {
  return (
    <>
      <MenuItem icon={HelpCircle} label="Help Centre" />
      <Divider />
      <HostPromo />
      <Divider />
      <MenuItem label="Refer a host" />
      <MenuItem label="Find a co-host" />
      <Divider />
      {/* Single entry, as designed: it opens the Create Account page, which
          links across to sign-in for people who already have an account. */}
      <MenuItem label="Log in or sign up" href="/signup" onClick={onNavigate} />
    </>
  );
}

function AuthedItems({
  onLogout,
  onNavigate,
  isAdmin,
}: {
  onLogout: () => void;
  onNavigate: () => void;
  isAdmin: boolean;
}) {
  // Lazy by construction: this component only mounts when a signed-in user
  // opens the menu, so guests and unopened menus cost nothing.
  const [unread, setUnread] = useState<{ messages: number; notifications: number }>({
    messages: 0,
    notifications: 0,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/unread")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { messages?: number; notifications?: number } | null) => {
        if (cancelled || !d) return;
        setUnread({ messages: d.messages ?? 0, notifications: d.notifications ?? 0 });
      })
      .catch(() => {
        /* a failed count must not break the menu — badges just stay hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {isAdmin && (
        <>
          <MenuItem
            icon={LayoutDashboard}
            label="Admin dashboard"
            href="/admin"
            onClick={onNavigate}
          />
          <Divider />
        </>
      )}
      <MenuItem icon={Heart} label="Wishlists" href="/wishlist" onClick={onNavigate} />
      <MenuItem icon={Compass} label="Trips" href="/trips" onClick={onNavigate} />
      <MenuItem icon={MessageSquare} label="Messages" href="/messages" badge={unread.messages} onClick={onNavigate} />
      <MenuItem icon={CircleUser} label="Profile" href="/profile/edit" onClick={onNavigate} />
      <Divider />
      <MenuItem icon={Bell} label="Notifications" href="/notifications" badge={unread.notifications} onClick={onNavigate} />
      <Divider />
      <MenuItem icon={HelpCircle} label="Help Centre" />
      <Divider />
      <HostPromo />
      <Divider />
      <MenuItem label="Refer a host" />
      <MenuItem label="Find a co-host" />
      <Divider />
      <MenuItem label="Log out" onClick={onLogout} />
    </>
  );
}

function HostPromo() {
  return (
    <a
      href="#"
      role="menuitem"
      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors"
    >
      <span className="min-w-0">
        <span className="block font-semibold text-on-surface">Become a host</span>
        <span className="block text-sm text-on-surface-variant leading-snug">
          It&apos;s easy to start hosting and earn extra income.
        </span>
      </span>
      <span className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
        <House aria-hidden className="size-6 text-on-primary-fixed-variant" strokeWidth={1.8} />
      </span>
    </a>
  );
}

function MenuItem({
  icon: Icon,
  label,
  href,
  badge,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  href?: string;
  /** Unread count. Hidden at 0 — a "0" badge is noise, not information. */
  badge?: number;
  onClick?: () => void;
}) {
  const className = cn(
    "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-on-surface hover:bg-surface-container-low transition-colors",
  );
  const inner = (
    <>
      {Icon && <Icon aria-hidden className="size-5 text-on-surface shrink-0" strokeWidth={1.8} />}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          aria-label={`${badge} unread`}
          className="ml-auto min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-primary text-white text-xs font-bold"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} role="menuitem" className={className} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" className={className} onClick={onClick}>
      {inner}
    </button>
  );
}

function Divider() {
  return <hr className="my-2 border-outline-variant/30" role="separator" />;
}
