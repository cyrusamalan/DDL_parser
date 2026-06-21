import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

type SignUpPageProps = {
  params: Promise<{ "sign-up"?: string[] }>;
};

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  const { "sign-up": segments } = await params;
  const hasClerkSubRoute = segments && segments.length > 0;

  return (
    <AuthPageShell mode="sign-up">
      {hasClerkSubRoute ? <SignUp routing="path" path="/sign-up" /> : <SignUpForm />}
    </AuthPageShell>
  );
}
