import { SignUp } from "@clerk/clerk-react";
import { MobileShell } from "@/components/layout/MobileShell";

export function SignUpPage() {
  return (
    <MobileShell>
      <div className="flex min-h-dvh flex-col items-center justify-center py-12">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">Splitzer</h1>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
      </div>
    </MobileShell>
  );
}
