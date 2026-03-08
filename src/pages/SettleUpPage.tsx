import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getCurrencySymbol } from "@/lib/format";
import { X, ArrowRight } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface LocationState {
  payerId: string;
  payeeId: string;
  payerName: string;
  payeeName: string;
  payerAvatarUrl?: string;
  payeeAvatarUrl?: string;
  amount: number;
  currency: string;
  groupId?: string;
}

export function SettleUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  const settleUp = useMutation(api.expenses.settleUp);

  const [amountStr, setAmountStr] = useState(
    state?.amount ? state.amount.toFixed(2) : ""
  );
  const [saving, setSaving] = useState(false);

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Missing settlement details. Please go back and try again.
        </p>
      </div>
    );
  }

  const amount = parseFloat(amountStr) || 0;

  async function handleRecord() {
    if (!state || amount <= 0) return;

    setSaving(true);
    try {
      await settleUp({
        payerId: state.payerId as Id<"users">,
        payeeId: state.payeeId as Id<"users">,
        amount,
        currency: state.currency,
        groupId: state.groupId
          ? (state.groupId as Id<"groups">)
          : undefined,
      });
      navigate(-1);
    } catch (err) {
      console.error("Failed to settle up:", err);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 pt-[env(safe-area-inset-top)]">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">Record a payment</h1>
        </div>

        {/* Payer → Payee visual */}
        <div className="flex items-center justify-center gap-6 px-4 py-8">
          <div className="flex flex-col items-center gap-2">
            <UserAvatar name={state.payerName} avatarUrl={state.payerAvatarUrl} size="lg" />
            <span className="text-sm">{state.payerName}</span>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground" />

          <div className="flex flex-col items-center gap-2">
            <UserAvatar name={state.payeeName} avatarUrl={state.payeeAvatarUrl} size="lg" />
            <span className="text-sm">{state.payeeName}</span>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 pb-2 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">
              {state.payerName}
            </span>{" "}
            paid{" "}
            <span className="text-foreground">
              {state.payeeName}
            </span>
          </p>
        </div>

        {/* Amount input */}
        <div className="flex justify-center px-4 py-6">
          <div className="relative w-56">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">
              {getCurrencySymbol(state.currency)}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-background py-4 pl-12 pr-4 text-center text-3xl focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {/* Info note */}
        <div className="mx-4 rounded-lg bg-muted/50 px-4 py-3">
          <p className="text-center text-xs text-muted-foreground">
            You are recording a payment that happened outside Splitzer.
          </p>
        </div>

        {/* Record button */}
        <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md">
            <button
              onClick={handleRecord}
              disabled={amount <= 0 || saving}
              className="w-full rounded-full bg-brand py-3 text-sm text-brand-foreground transition-colors hover:bg-brand-hover disabled:bg-muted disabled:text-muted-foreground"
            >
              {saving ? "Recording..." : "Record payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
