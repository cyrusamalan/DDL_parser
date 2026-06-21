import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignInSsoCallbackPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center">
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
