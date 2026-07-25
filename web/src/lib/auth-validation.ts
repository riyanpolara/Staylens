/**
 * Shared auth validators — pure functions usable on both client and server.
 * The server actions are the source of truth (never trust the client), but the
 * forms reuse these for instant feedback.
 */
import { isValidEmail } from "@/lib/validation";

export { isValidEmail };

/** At least 8 chars, with a letter and a number. Returns null when valid. */
export function passwordError(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw)) return "Password must contain a letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain a number.";
  return null;
}

/** Whole years between `birthday` and now. */
export function ageInYears(birthday: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthday.getFullYear();
  const m = now.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age -= 1;
  return age;
}

export const MIN_AGE = 18;

/** Validates a yyyy-mm-dd birthday string. Returns null when valid. */
export function birthdayError(value: string): string | null {
  if (!value) return "Birthday is required.";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Enter a valid date.";
  if (d > new Date()) return "Birthday can't be in the future.";
  if (ageInYears(d) < MIN_AGE) return `You must be at least ${MIN_AGE} to sign up.`;
  return null;
}

export type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthday: string;
};

/** Full sign-up validation. Returns a field→message map ({} when valid). */
export function validateSignUp(input: SignUpInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.firstName.trim()) errors.firstName = "First name is required.";
  if (!input.lastName.trim()) errors.lastName = "Last name is required.";
  if (!isValidEmail(input.email)) errors.email = "Enter a valid email address.";
  const pw = passwordError(input.password);
  if (pw) errors.password = pw;
  const bd = birthdayError(input.birthday);
  if (bd) errors.birthday = bd;
  return errors;
}
