import { z } from "zod";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const ABOUT_MAX = 500;

export const profileFormSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(1, "Legal name is required")
    .max(80, "Keep it under 80 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .regex(EMAIL_RE, "Enter a valid email address"),
  phone: z.string().trim().max(40, "Keep it under 40 characters"),
  location: z.string().trim().max(120, "Keep it under 120 characters"),
  emergencyContact: z.string().trim().max(80, "Keep it under 80 characters"),
  about: z.string().max(ABOUT_MAX, `Keep it under ${ABOUT_MAX} characters`),
  personality: z.array(z.string().trim().min(1).max(30)).max(12, "Up to 12 tags"),
  travelPreferences: z
    .array(z.string().trim().min(1).max(30))
    .max(12, "Up to 12 preferences"),
  languages: z.array(
    z.object({
      id: z.string(),
      name: z.string().trim().min(1, "Required"),
      level: z.string().trim().min(1, "Required"),
      verified: z.boolean(),
    }),
  ),
  // Connected accounts are deliberately NOT part of this form. Whether a social
  // login is linked is decided by Supabase Auth identities, not by a checkbox —
  // storing it here would let the profile claim a connection that doesn't exist.
  privacy: z.object({
    publicProfile: z.boolean(),
    showWishlists: z.boolean(),
  }),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
