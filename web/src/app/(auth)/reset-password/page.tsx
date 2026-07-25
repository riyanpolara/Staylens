import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Set a new password | Staylens" };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
