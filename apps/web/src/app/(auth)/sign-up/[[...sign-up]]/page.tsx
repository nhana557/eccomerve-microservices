import { SignUp } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/clerk-config";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/features/auth/layouts/AuthLayout";

export default function SignUpPage() {
  if (!isClerkEnabled()) {
    redirect("/");
  }

  return (
    <AuthLayout>
      <SignUp />
    </AuthLayout>
  );
}
