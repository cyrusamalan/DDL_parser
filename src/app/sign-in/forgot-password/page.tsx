import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function ForgotPasswordPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <AuthPageShell
      mode="sign-in"
      title="Reset your password"
      subtitle="We'll email you a code to choose a new password."
      showSwitchLink={false}
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
