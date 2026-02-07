import { SignIn } from "@clerk/clerk-react";
import { MobileShell } from "@/components/layout/MobileShell";

export function SignInPage() {
  return (
    <MobileShell>
      <div className="flex min-h-dvh flex-col items-center justify-center py-12">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">Splitzer</h1>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />
      </div>
    </MobileShell>
  );
}
