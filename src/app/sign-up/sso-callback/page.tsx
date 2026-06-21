import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignUpSsoCallbackPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center">
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
