import { SignIn } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/clerk-config";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/features/auth/layouts/AuthLayout";

export default function SignInPage() {
  if (!isClerkEnabled()) {
    redirect("/");
  }

  return (
    <AuthLayout>
      <SignIn />
    </AuthLayout>
  );
}
