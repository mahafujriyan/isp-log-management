import { Suspense } from "react";
import { UserLoginForm } from "@isp/features/auth/components/UserLoginForm";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1565C0]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <UserLoginForm />
    </Suspense>
  );
}
