import { SignIn } from "@clerk/clerk-react";
import { MobileShell } from "@/components/layout/MobileShell";

export function SignInPage() {
  return (
    <MobileShell hideNav>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-brand">
            <span className="text-2xl font-black text-brand-foreground">S</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Splitzer</h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Split expenses effortlessly
          </p>
        </div>
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
