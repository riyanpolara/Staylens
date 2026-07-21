"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Achievement = {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  /** icon-circle background + foreground tone classes */
  iconBg: string;
  iconText: string;
};

/** One achievement tile with the Stitch hover lift (scale 1.02). */
export function AchievementCard({ icon: Icon, label, sublabel, iconBg, iconText }: Achievement) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="bg-surface-container-low p-6 rounded-xl flex flex-col items-center justify-center text-center shadow-tinted border border-outline-variant/10"
    >
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-2", iconBg, iconText)}>
        <Icon aria-hidden className="size-6" strokeWidth={2.2} />
      </div>
      <p className="text-sm font-semibold text-primary">{label}</p>
      <p className="text-xs text-on-surface-variant">{sublabel}</p>
    </motion.div>
  );
}
