import Image from "next/image";
import type { TravelHistory } from "@/lib/profile";

const FALLBACK_COVER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBX3S_kcJQNdgt4FvDPiu2DDNQIOvKyZfxoDfxBwBghg0Q7mD2E33vZXCIFnU_3_v0kccJ8B-BqZIUg-q2Tc_8-U44cGi9Ld0zZLBECGCGopJy_A8kPuZnWlxzabeJo8A4mYGT1UC-Q_dkho528U93-KO4s2oZ_vTWesii1YiIlwAzeHasvYHa3uAiNLR261vGbwZ2m9SIMTNiigvgSIMXur2NS7g6NqblhUnXqq3Fb-4L8kf5RgN4U2w";

/** Travel History card: cover map, countries, last trip, View Travel Log CTA. */
export function TravelHistoryCard({ history }: { history: TravelHistory }) {
  const cover = history.coverImage || FALLBACK_COVER;
  return (
    <section className="bg-white rounded-[20px] p-6 md:p-10 shadow-tinted border border-outline-variant/10 overflow-hidden">
      <h3 className="font-display text-2xl font-semibold text-on-surface mb-6">Travel History</h3>
      <div className="relative h-48 rounded-xl overflow-hidden mb-4">
        <Image
          src={cover}
          alt={`World map showing ${history.countries} countries visited`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <p className="text-2xl font-bold">{history.countries} Countries</p>
          <p className="text-sm opacity-90">Last trip: {history.lastTrip}</p>
        </div>
      </div>
      <button
        type="button"
        className="w-full py-2 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
      >
        View Travel Log
      </button>
    </section>
  );
}
