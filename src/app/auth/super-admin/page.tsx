import { Suspense } from "react";
import { SuperAdminLoginForm } from "@/components/auth/SuperAdminLoginForm";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1220]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
    </div>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <SuperAdminLoginForm />
    </Suspense>
  );
}
