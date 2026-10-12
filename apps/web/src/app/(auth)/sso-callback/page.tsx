import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/clerk-config";
import { redirect } from "next/navigation";

export default function SSOCallbackPage() {
  if (!isClerkEnabled()) {
    redirect("/");
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12 px-4">
      <AuthenticateWithRedirectCallback signInForceRedirectUrl="/" />
    </div>
  );
}
