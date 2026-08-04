import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Caprasimo, Figtree } from "next/font/google";
import { AdminShell } from "@/components/admin/admin-shell";
import { checkAdmin } from "@/lib/admin/auth";
import "./admin-theme.css";

/**
 * Admin area layout.
 *
 * The dashboard uses the "Organic" design system from the Claude Design
 * handoff, which is a different visual language to the public StayLens site.
 * Its tokens and component classes live in admin-theme.css, every selector
 * scoped under `.admin-scope` — so mounting it here cannot affect any public
 * page, while the admin renders exactly as designed.
 */

const caprasimo = Caprasimo({
  variable: "--admin-font-heading",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const figtree = Figtree({
  variable: "--admin-font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | StayLens Admin" },
  description: "StayLens operations dashboard.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Authoritative gate. Middleware turns non-admins away first, but this runs
  // for every /admin/* render (including RSC navigations), so the area stays
  // protected even if the matcher changes or middleware is bypassed.
  const check = await checkAdmin();
  if (check.state === "anonymous") redirect("/login?redirect=%2Fadmin");
  if (check.state === "forbidden") redirect("/403");

  return (
    <div
      className={`admin-scope ${caprasimo.variable} ${figtree.variable}`}
      data-theme="light"
      style={{
        // bind the design system's font vars to the next/font faces
        ["--font-heading" as string]: "var(--admin-font-heading)",
        ["--font-body" as string]: "var(--admin-font-body)",
      }}
    >
      <AdminShell identity={check.identity}>{children}</AdminShell>
    </div>
  );
}
