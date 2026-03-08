import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatCurrency } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { HandCoins, Receipt, ShoppingCart, Utensils, Car, Home, Zap, Film, Calendar, Users, StickyNote, Layers } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: Utensils, transport: Car, housing: Home, utilities: Zap,
  entertainment: Film, shopping: ShoppingCart, general: Receipt,
};

const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  food: { bg: "bg-orange-900/30", icon: "text-orange-400" },
  transport: { bg: "bg-sky-900/30", icon: "text-sky-400" },
  housing: { bg: "bg-green-900/30", icon: "text-green-400" },
  utilities: { bg: "bg-yellow-900/30", icon: "text-yellow-400" },
  entertainment: { bg: "bg-purple-900/30", icon: "text-purple-400" },
  shopping: { bg: "bg-pink-900/30", icon: "text-pink-400" },
  general: { bg: "bg-muted", icon: "text-muted-foreground" },
};

function getCategoryIcon(category?: string): React.ElementType {
  if (!category) return Receipt;
  return CATEGORY_ICONS[category.toLowerCase()] ?? Receipt;
}

function getCategoryColors(category?: string, isSettlement = false) {
  if (isSettlement) return { bg: "bg-brand-light", icon: "text-brand" };
  if (!category) return CATEGORY_COLORS.general;
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.general;
}

const SPLIT_METHOD_LABELS: Record<string, string> = {
  equal: "Split equally", exact: "Exact amounts",
  percentage: "By percentages", shares: "By shares",
};

export function ExpenseDetailSheet({ expenseId, onClose }: { expenseId: Id<"expenses"> | null; onClose: () => void }) {
  const data = useQuery(api.expenses.getExpenseDetail, expenseId ? { expenseId } : "skip");

  return (
    <Sheet open={expenseId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-xl bg-card border-border">
        {data ? (
          <>
            <SheetHeader className="px-4 pb-2">
              <div className="flex items-center gap-3">
                {(() => {
                  const colors = getCategoryColors(data.category, data.isSettlement);
                  const Icon = data.isSettlement ? HandCoins : getCategoryIcon(data.category);
                  return (
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-base font-medium tracking-tight">{data.description}</SheetTitle>
                  <SheetDescription className="text-2xl text-foreground">
                    {formatCurrency(data.totalAmount, data.currency)}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-8">
              {/* Meta info */}
              <div className="overflow-hidden rounded-lg border border-border bg-muted">
                <MetaRow icon={<Calendar className="h-4 w-4" />} label="Date" last={false}>
                  {new Date(data.date).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })}
                </MetaRow>
                <MetaRow icon={<Receipt className="h-4 w-4" />} label="Paid by" last={false}>{data.payerName}</MetaRow>
                {data.groupName && <MetaRow icon={<Users className="h-4 w-4" />} label="Group" last={false}>{data.groupName}</MetaRow>}
                <MetaRow icon={<Layers className="h-4 w-4" />} label="Split" last={!data.notes}>
                  {SPLIT_METHOD_LABELS[data.splitMethod] ?? data.splitMethod}
                </MetaRow>
                {data.notes && <MetaRow icon={<StickyNote className="h-4 w-4" />} label="Notes" last>{data.notes}</MetaRow>}
              </div>

              {/* Split breakdown */}
              <div>
                <h4 className="mb-2 text-xs text-muted-foreground">Split breakdown</h4>
                <div className="overflow-hidden rounded-lg border border-border bg-muted">
                  {data.splits.map((split, idx) => (
                    <div key={split.userId} className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? "border-t border-border" : ""}`}>
                      <span className="text-sm">{split.userName}</span>
                      <span className={`text-sm ${split.netAmount > 0.005 ? "text-positive" : split.netAmount < -0.005 ? "text-negative" : "text-muted-foreground"}`}>
                        {split.netAmount > 0.005 ? `+${formatCurrency(split.netAmount, data.currency)}` : split.netAmount < -0.005 ? `-${formatCurrency(Math.abs(split.netAmount), data.currency)}` : formatCurrency(0, data.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-7 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetaRow({ icon, label, children, last }: { icon: React.ReactNode; label: string; children: React.ReactNode; last: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!last ? "border-b border-border" : ""}`}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm text-foreground">{children}</span>
    </div>
  );
}
