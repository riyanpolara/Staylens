import { AtSign, Camera, Globe, MessageCircle, Play, TreePine } from "lucide-react";
import { LP } from "@/components/landing/landing-data";

const COLUMNS = [
  { title: "Company", links: ["About", "Careers", "Press", "Journal"] },
  { title: "Support", links: ["Help Center", "Safety", "Cancellation", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms", "Cookies", "Sitemap"] },
];

const SOCIALS = [
  { label: "Community", Icon: MessageCircle },
  { label: "Photos", Icon: Camera },
  { label: "Email", Icon: AtSign },
  { label: "Videos", Icon: Play },
];

/** Premium dark footer (landing page only — inner pages keep the light one). */
export function PremiumFooter() {
  return (
    <footer className="px-[8%] pt-20 pb-10 pb-safe" style={{ background: LP.deep, color: "rgba(255,255,255,.72)" }}>
      <div className="max-w-[1400px] mx-auto">
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.6fr] gap-10 pb-14 border-b"
          style={{ borderColor: "rgba(255,255,255,.12)" }}
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <TreePine aria-hidden className="size-8" style={{ color: "#7bc79b" }} strokeWidth={2} />
              <span className="font-extrabold text-[26px] text-white">Staylens</span>
            </div>
            <p className="text-[15px] leading-relaxed max-w-[280px] mb-[22px] m-0">
              A new lens on luxury travel — extraordinary homes, matched by
              intelligence, wrapped in care.
            </p>
            <div className="flex gap-3">
              {SOCIALS.map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-colors hover:text-white"
                  style={{ background: "rgba(255,255,255,.08)", color: "#9ec9b0" }}
                >
                  <Icon aria-hidden className="size-[18px]" strokeWidth={2} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-white font-bold text-base mb-5">{col.title}</div>
              <div className="flex flex-col gap-[13px] text-[15px]">
                {col.links.map((l) => (
                  <a key={l} href="#" className="transition-colors hover:text-[#c9a24b]" style={{ color: "rgba(255,255,255,.72)" }}>
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="text-white font-bold text-base mb-5">Newsletter</div>
            <p className="text-[15px] mb-4 m-0">Rare stays and quiet places, once a month.</p>
            <form
              action="#"
              className="flex rounded-full border p-1.5 pl-5"
              style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.15)" }}
            >
              <label htmlFor="lp-newsletter" className="sr-only">Email address</label>
              <input
                id="lp-newsletter"
                type="email"
                placeholder="Email address"
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-white text-[15px] placeholder:text-white/40"
              />
              <button
                type="submit"
                className="px-[22px] py-[11px] rounded-full font-bold text-sm border-none cursor-pointer shrink-0"
                style={{ background: LP.gold, color: "#1a1408" }}
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="flex items-center justify-between pt-7 flex-wrap gap-4 text-sm">
          <span>© 2026 StayLens. Crafted for the curious.</span>
          <div className="flex gap-6">
            <span className="inline-flex items-center gap-[7px]">
              <Globe aria-hidden className="size-4" strokeWidth={2} /> English (US)
            </span>
            <span className="inline-flex items-center gap-[7px]">$ USD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
