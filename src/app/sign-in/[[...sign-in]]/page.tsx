import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

type SignInPageProps = {
  params: Promise<{ "sign-in"?: string[] }>;
};

export default async function SignInPage({ params }: SignInPageProps) {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  const { "sign-in": segments } = await params;
  const hasClerkSubRoute = segments && segments.length > 0;

  return (
    <AuthPageShell mode="sign-in">
      {hasClerkSubRoute ? <SignIn routing="path" path="/sign-in" /> : <SignInForm />}
    </AuthPageShell>
  );
}
