import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatCurrency } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  HandCoins,
  Receipt,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  Calendar,
  Users,
  StickyNote,
  Layers,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: Utensils,
  transport: Car,
  housing: Home,
  utilities: Zap,
  entertainment: Film,
  shopping: ShoppingCart,
  general: Receipt,
};

function getCategoryIcon(category?: string): React.ElementType {
  if (!category) return Receipt;
  return CATEGORY_ICONS[category.toLowerCase()] ?? Receipt;
}

const SPLIT_METHOD_LABELS: Record<string, string> = {
  equal: "Split equally",
  exact: "Split by exact amounts",
  percentage: "Split by percentages",
  shares: "Split by shares",
};

interface ExpenseDetailSheetProps {
  expenseId: Id<"expenses"> | null;
  onClose: () => void;
}

export function ExpenseDetailSheet({
  expenseId,
  onClose,
}: ExpenseDetailSheetProps) {
  const data = useQuery(
    api.expenses.getExpenseDetail,
    expenseId ? { expenseId } : "skip"
  );

  const isOpen = expenseId !== null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
        {data ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {data.isSettlement ? (
                    <HandCoins className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    (() => {
                      const Icon = getCategoryIcon(data.category);
                      return <Icon className="h-5 w-5 text-muted-foreground" />;
                    })()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg">
                    {data.description}
                  </SheetTitle>
                  <SheetDescription className="text-xl font-bold text-foreground">
                    {formatCurrency(data.totalAmount, data.currency)}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-6">
              {/* Meta info */}
              <div className="space-y-2.5 rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Date</span>
                  <span className="ml-auto font-medium">
                    {new Date(data.date).toLocaleDateString("en", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Paid by</span>
                  <span className="ml-auto font-medium">{data.payerName}</span>
                </div>
                {data.groupName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Group</span>
                    <span className="ml-auto font-medium">{data.groupName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Split</span>
                  <span className="ml-auto font-medium">
                    {SPLIT_METHOD_LABELS[data.splitMethod] ?? data.splitMethod}
                  </span>
                </div>
                {data.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <StickyNote className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Notes</span>
                    <span className="ml-auto text-right font-medium">
                      {data.notes}
                    </span>
                  </div>
                )}
              </div>

              {/* Split breakdown */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Split breakdown
                </h4>
                <div className="space-y-1.5">
                  {data.splits.map((split) => (
                    <div
                      key={split.userId}
                      className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                    >
                      <span className="text-sm font-medium">
                        {split.userName}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          split.netAmount > 0.005
                            ? "text-teal-600"
                            : split.netAmount < -0.005
                              ? "text-orange-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {split.netAmount > 0.005
                          ? `+${formatCurrency(split.netAmount, data.currency)}`
                          : split.netAmount < -0.005
                            ? `-${formatCurrency(split.netAmount, data.currency)}`
                            : formatCurrency(0, data.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Loading state */
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-6 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
