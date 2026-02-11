import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  computeEqualSplit,
  computeExactSplit,
  computePercentageSplit,
  computeSharesSplit,
} from "@/lib/splits";
import { getCurrencySymbol, SUPPORTED_CURRENCIES } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  X,
  Calendar,
  StickyNote,
  Receipt,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  ShoppingCart,
  Check,
  Users,
  Plane,
  Heart,
  LayoutGrid,
} from "lucide-react";

type SplitMethod = "equal" | "exact" | "percentage" | "shares";

interface LocationState {
  groupId?: string;
  friendId?: string;
  receiptData?: {
    amount: number;
    currency: string;
    date: string;
    description: string;
  };
}

const CATEGORIES = [
  { id: "general", label: "General", icon: Receipt },
  { id: "food", label: "Food", icon: Utensils },
  { id: "transport", label: "Transport", icon: Car },
  { id: "housing", label: "Housing", icon: Home },
  { id: "utilities", label: "Utilities", icon: Zap },
  { id: "entertainment", label: "Entertainment", icon: Film },
  { id: "shopping", label: "Shopping", icon: ShoppingCart },
];

const GROUP_TYPE_ICONS: Record<string, typeof Plane> = {
  trip: Plane,
  home: Home,
  couple: Heart,
  other: LayoutGrid,
};

const GROUP_TYPE_COLORS: Record<string, string> = {
  trip: "bg-orange-500",
  home: "bg-teal-600",
  couple: "bg-pink-500",
  other: "bg-gray-500",
};

export function AddExpensePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) ?? {};

  // Selection state: when no context provided, user picks friend or group first
  const needsSelection = !state.groupId && !state.friendId;
  const [selectedContext, setSelectedContext] = useState<{
    type: "friend" | "group";
    id: string;
  } | null>(null);

  const viewer = useQuery(api.users.getViewer);
  const addExpense = useMutation(api.expenses.addExpense);

  // Effective IDs: from route state or user selection
  const effectiveGroupId =
    state.groupId ?? (selectedContext?.type === "group" ? selectedContext.id : undefined);
  const effectiveFriendId =
    state.friendId ?? (selectedContext?.type === "friend" ? selectedContext.id : undefined);

  // If groupId, load group for members and name
  const group = useQuery(
    api.groups.getGroup,
    effectiveGroupId ? { groupId: effectiveGroupId as Id<"groups"> } : "skip"
  );

  // If friendId, load friend detail
  const friendDetail = useQuery(
    api.friends.getFriendDetail,
    effectiveFriendId ? { friendId: effectiveFriendId as Id<"users"> } : "skip"
  );

  // Load friends + groups for the selection screen (only when needed)
  const friendsData = useQuery(
    api.friends.getMyFriends,
    needsSelection && !selectedContext ? {} : "skip"
  );
  const groupsData = useQuery(
    api.groups.getMyGroups,
    needsSelection && !selectedContext ? {} : "skip"
  );
  const [selectionSearch, setSelectionSearch] = useState("");

  // Form state (prefill from receipt data if available)
  const [description, setDescription] = useState(
    state.receiptData?.description ?? ""
  );
  const [amountStr, setAmountStr] = useState(
    state.receiptData?.amount ? String(state.receiptData.amount) : ""
  );
  const [currency, setCurrency] = useState<string | null>(
    state.receiptData?.currency ?? null
  );
  const [category, setCategory] = useState("general");
  const [date, setDate] = useState(
    state.receiptData?.date ?? new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [saving, setSaving] = useState(false);

  // Sheet states
  const [showPayerSheet, setShowPayerSheet] = useState(false);
  const [showSplitSheet, setShowSplitSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showNotesSheet, setShowNotesSheet] = useState(false);

  // Payer selection
  const [payerId, setPayerId] = useState<Id<"users"> | null>(null);

  // Build participants list from group or friend context
  const participants = useMemo(() => {
    if (!viewer) return [];

    if (group) {
      return group.members.map((m) => ({
        userId: m.userId,
        name: m.userId === viewer._id ? "You" : m.name,
        avatarUrl: m.avatarUrl,
      }));
    }

    if (friendDetail) {
      return [
        { userId: viewer._id, name: "You", avatarUrl: viewer.avatarUrl },
        {
          userId: friendDetail.friend._id,
          name: friendDetail.friend.name,
          avatarUrl: friendDetail.friend.avatarUrl,
        },
      ];
    }

    // No context — just the current user
    return [{ userId: viewer._id, name: "You", avatarUrl: viewer.avatarUrl }];
  }, [viewer, group, friendDetail]);

  // Effective currency
  const effectiveCurrency =
    currency ??
    group?.defaultCurrency ??
    viewer?.defaultCurrency ??
    "INR";

  // Set default payer to viewer
  const effectivePayerId = payerId ?? viewer?._id ?? null;

  // Equal split state: which participants are included
  const [equalIncluded, setEqualIncluded] = useState<Set<string>>(new Set());

  // Exact split state
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});

  // Percentage split state
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  // Shares split state
  const [sharesMap, setSharesMap] = useState<Record<string, string>>({});

  // Initialize equal included when participants load
  const participantIds = participants.map((p) => p.userId).join(",");
  useState(() => {
    if (participants.length > 0 && equalIncluded.size === 0) {
      setEqualIncluded(new Set(participants.map((p) => p.userId)));
    }
  });

  // Re-init if participants change
  useMemo(() => {
    if (participants.length > 0 && equalIncluded.size === 0) {
      setEqualIncluded(new Set(participants.map((p) => p.userId)));
    }
  }, [participantIds]);

  const amount = parseFloat(amountStr) || 0;

  const contextLabel = group
    ? group.name
    : friendDetail
      ? `you and ${friendDetail.friend.name}`
      : "non-group";

  const payerName = effectivePayerId
    ? participants.find((p) => p.userId === effectivePayerId)?.name ?? "someone"
    : "someone";

  const splitMethodLabel =
    splitMethod === "equal"
      ? "equally"
      : splitMethod === "exact"
        ? "by exact amounts"
        : splitMethod === "percentage"
          ? "by percentages"
          : "by shares";

  async function handleSave() {
    if (!viewer || !effectivePayerId || amount <= 0 || !description.trim()) return;

    setSaving(true);
    try {
      // Compute splits
      let splits;
      const participantList = participants.map((p) => ({
        userId: p.userId,
        included: equalIncluded.has(p.userId),
      }));

      if (splitMethod === "equal") {
        splits = computeEqualSplit(amount, participantList, effectivePayerId);
      } else if (splitMethod === "exact") {
        const entries = participants
          .filter((p) => (parseFloat(exactAmounts[p.userId] ?? "0") || 0) > 0)
          .map((p) => ({
            userId: p.userId,
            amount: parseFloat(exactAmounts[p.userId] ?? "0") || 0,
          }));
        splits = computeExactSplit(amount, entries, effectivePayerId);
      } else if (splitMethod === "percentage") {
        const entries = participants
          .filter(
            (p) => (parseFloat(percentages[p.userId] ?? "0") || 0) > 0
          )
          .map((p) => ({
            userId: p.userId,
            percentage: parseFloat(percentages[p.userId] ?? "0") || 0,
          }));
        splits = computePercentageSplit(amount, entries, effectivePayerId);
      } else {
        const entries = participants
          .filter((p) => (parseFloat(sharesMap[p.userId] ?? "0") || 0) > 0)
          .map((p) => ({
            userId: p.userId,
            shares: parseFloat(sharesMap[p.userId] ?? "0") || 0,
          }));
        splits = computeSharesSplit(amount, entries, effectivePayerId);
      }

      if (!splits || splits.length === 0) {
        setSaving(false);
        return;
      }

      await addExpense({
        groupId: effectiveGroupId
          ? (effectiveGroupId as Id<"groups">)
          : undefined,
        paidBy: effectivePayerId,
        description: description.trim(),
        totalAmount: amount,
        currency: effectiveCurrency,
        category,
        date: new Date(date).getTime(),
        splitMethod,
        splits,
        notes: notes.trim() || undefined,
      });

      navigate(-1);
    } catch (err) {
      console.error("Failed to add expense:", err);
      setSaving(false);
    }
  }

  if (!viewer) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  const canSave =
    description.trim().length > 0 &&
    amount > 0 &&
    effectivePayerId &&
    !saving;

  // ── Selection Screen ───────────────────────────────────────────────────────
  if (needsSelection && !selectedContext) {
    const searchLower = selectionSearch.toLowerCase();

    const allFriends = [
      ...(friendsData?.visible ?? []),
      ...(friendsData?.hidden ?? []),
    ];
    const filteredFriends = searchLower
      ? allFriends.filter((f) => f.name.toLowerCase().includes(searchLower))
      : allFriends;

    const allGroups = groupsData?.groups ?? [];
    const filteredGroups = searchLower
      ? allGroups.filter((g) => g.name.toLowerCase().includes(searchLower))
      : allGroups;

    const isLoading = !friendsData && !groupsData;

    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-md">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 pt-[env(safe-area-inset-top)]">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold">Add an expense</h1>
            <div className="w-14" />
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <span className="shrink-0 text-sm text-muted-foreground">
              With you and:
            </span>
            <input
              type="text"
              placeholder="Enter names, emails, or phone #s"
              value={selectionSearch}
              onChange={(e) => setSelectionSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-y-auto pb-8">
              {/* Recent friends */}
              {filteredFriends.length > 0 && (
                <div>
                  <h2 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent
                  </h2>
                  {filteredFriends.map((friend) => (
                    <button
                      key={friend.friendId}
                      onClick={() =>
                        setSelectedContext({
                          type: "friend",
                          id: friend.friendId,
                        })
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                    >
                      {friend.avatarUrl ? (
                        <img
                          src={friend.avatarUrl}
                          alt={friend.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                          {friend.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 text-left text-sm font-medium">
                        {friend.name}
                      </span>
                      <div className="h-5 w-5 rounded-full border-2 border-border" />
                    </button>
                  ))}
                </div>
              )}

              {/* Groups */}
              {filteredGroups.length > 0 && (
                <div>
                  <h2 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Groups
                  </h2>
                  {filteredGroups.map((g) => {
                    const GIcon =
                      GROUP_TYPE_ICONS[g.type ?? "other"] ?? LayoutGrid;
                    const gBg =
                      GROUP_TYPE_COLORS[g.type ?? "other"] ?? "bg-gray-500";
                    return (
                      <button
                        key={g._id}
                        onClick={() =>
                          setSelectedContext({ type: "group", id: g._id })
                        }
                        className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${gBg}`}
                        >
                          <GIcon className="h-5 w-5 text-white" />
                        </div>
                        <span className="flex-1 text-left text-sm font-medium">
                          {g.name}
                        </span>
                        <div className="h-5 w-5 rounded-full border-2 border-border" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {filteredFriends.length === 0 && filteredGroups.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {selectionSearch
                      ? "No friends or groups match your search"
                      : "No friends or groups yet"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 pt-[env(safe-area-inset-top)]">
          <button
            onClick={() => {
              if (needsSelection && selectedContext) {
                setSelectedContext(null);
              } else {
                navigate(-1);
              }
            }}
            className="rounded-full p-2 text-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">Add expense</h1>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-teal-600 transition-colors hover:bg-teal-50 disabled:text-muted-foreground disabled:hover:bg-transparent"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Context banner */}
        <div className="flex items-center gap-2 px-4 py-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            With <span className="font-medium text-foreground">{contextLabel}</span>
          </p>
        </div>

        {/* Description */}
        <div className="px-4 py-3">
          <input
            type="text"
            placeholder="What was this expense for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border-b border-border bg-transparent pb-2 text-lg font-medium placeholder:text-muted-foreground focus:border-teal-600 focus:outline-none"
          />
        </div>

        {/* Amount */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setShowCategorySheet(true)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted"
          >
            {(() => {
              const cat = CATEGORIES.find((c) => c.id === category);
              const Icon = cat?.icon ?? Receipt;
              return <Icon className="h-6 w-6 text-muted-foreground" />;
            })()}
          </button>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
              {getCurrencySymbol(effectiveCurrency)}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-lg font-semibold placeholder:text-muted-foreground focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Paid by + Split method */}
        <div className="px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Paid by{" "}
            <button
              onClick={() => setShowPayerSheet(true)}
              className="font-semibold text-foreground underline decoration-dotted underline-offset-4"
            >
              {payerName}
            </button>{" "}
            and split{" "}
            <button
              onClick={() => setShowSplitSheet(true)}
              className="font-semibold text-foreground underline decoration-dotted underline-offset-4"
            >
              {splitMethodLabel}
            </button>
          </p>
        </div>

        {/* Date, currency, notes row */}
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-full border border-border bg-background py-1.5 pl-8 pr-3 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <select
            value={effectiveCurrency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNotesSheet(true)}
            className="rounded-full border border-border p-2 text-muted-foreground hover:bg-muted"
          >
            <StickyNote className="h-4 w-4" />
          </button>
        </div>

        {/* ── Choose Payer Sheet ── */}
        <Sheet open={showPayerSheet} onOpenChange={setShowPayerSheet}>
          <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Who paid?</SheetTitle>
            </SheetHeader>
            <div className="max-h-[60vh] overflow-y-auto pb-4">
              {participants.map((p) => (
                <button
                  key={p.userId}
                  onClick={() => {
                    setPayerId(p.userId);
                    setShowPayerSheet(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-left text-sm font-medium">
                    {p.name}
                  </span>
                  {p.userId === effectivePayerId && (
                    <Check className="h-5 w-5 text-teal-600" />
                  )}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Split Options Sheet ── */}
        <Sheet open={showSplitSheet} onOpenChange={setShowSplitSheet}>
          <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Split options</SheetTitle>
            </SheetHeader>

            {/* Method tabs */}
            <div className="flex gap-2 px-4 pb-3">
              {(
                [
                  { id: "equal", label: "=" },
                  { id: "exact", label: "1.23" },
                  { id: "percentage", label: "%" },
                  { id: "shares", label: "#" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSplitMethod(m.id)}
                  className={`flex-1 rounded-full border py-2 text-sm font-medium transition-colors ${
                    splitMethod === m.id
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
              {splitMethod === "equal" && (
                <EqualSplitPanel
                  participants={participants}
                  included={equalIncluded}
                  onToggle={(uid) => {
                    setEqualIncluded((prev) => {
                      const next = new Set(prev);
                      if (next.has(uid)) next.delete(uid);
                      else next.add(uid);
                      return next;
                    });
                  }}
                  amount={amount}
                  currency={effectiveCurrency}
                />
              )}
              {splitMethod === "exact" && (
                <ExactSplitPanel
                  participants={participants}
                  amounts={exactAmounts}
                  onAmountChange={(uid, val) =>
                    setExactAmounts((prev) => ({ ...prev, [uid]: val }))
                  }
                  totalAmount={amount}
                  currency={effectiveCurrency}
                />
              )}
              {splitMethod === "percentage" && (
                <PercentageSplitPanel
                  participants={participants}
                  percentages={percentages}
                  onPercentChange={(uid, val) =>
                    setPercentages((prev) => ({ ...prev, [uid]: val }))
                  }
                />
              )}
              {splitMethod === "shares" && (
                <SharesSplitPanel
                  participants={participants}
                  shares={sharesMap}
                  onShareChange={(uid, val) =>
                    setSharesMap((prev) => ({ ...prev, [uid]: val }))
                  }
                  totalAmount={amount}
                  currency={effectiveCurrency}
                />
              )}
            </div>

            <div className="border-t px-4 py-3">
              <button
                onClick={() => setShowSplitSheet(false)}
                className="w-full rounded-full bg-teal-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Category Sheet ── */}
        <Sheet open={showCategorySheet} onOpenChange={setShowCategorySheet}>
          <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Category</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 px-4 pb-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      setShowCategorySheet(false);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                      category === cat.id
                        ? "border-teal-600 bg-teal-50"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        category === cat.id
                          ? "text-teal-600"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Notes Sheet ── */}
        <Sheet open={showNotesSheet} onOpenChange={setShowNotesSheet}>
          <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Notes</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note..."
                rows={4}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:border-teal-600 focus:outline-none"
              />
              <button
                onClick={() => setShowNotesSheet(false)}
                className="mt-3 w-full rounded-full bg-teal-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

// ─── Split Panels ───────────────────────────────────────────────────────────

function EqualSplitPanel({
  participants,
  included,
  onToggle,
  amount,
  currency,
}: {
  participants: { userId: Id<"users">; name: string }[];
  included: Set<string>;
  onToggle: (uid: string) => void;
  amount: number;
  currency: string;
}) {
  const count = included.size;
  const perPerson = count > 0 ? amount / count : 0;

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        {getCurrencySymbol(currency)}
        {perPerson.toFixed(2)}/person
        {count > 0 && ` (${count} ${count === 1 ? "person" : "people"})`}
      </p>
      {participants.map((p) => (
        <label
          key={p.userId}
          className="flex items-center gap-3 py-2.5"
        >
          <input
            type="checkbox"
            checked={included.has(p.userId)}
            onChange={() => onToggle(p.userId)}
            className="h-4 w-4 rounded border-border accent-teal-600"
          />
          <span className="flex-1 text-sm font-medium">{p.name}</span>
          <span className="text-sm text-muted-foreground">
            {included.has(p.userId)
              ? `${getCurrencySymbol(currency)}${perPerson.toFixed(2)}`
              : "-"}
          </span>
        </label>
      ))}
    </div>
  );
}

function ExactSplitPanel({
  participants,
  amounts,
  onAmountChange,
  totalAmount,
  currency,
}: {
  participants: { userId: Id<"users">; name: string }[];
  amounts: Record<string, string>;
  onAmountChange: (uid: string, val: string) => void;
  totalAmount: number;
  currency: string;
}) {
  const assigned = Object.values(amounts).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0
  );
  const remaining = totalAmount - assigned;

  return (
    <div>
      {participants.map((p) => (
        <div key={p.userId} className="flex items-center gap-3 py-2.5">
          <span className="flex-1 text-sm font-medium">{p.name}</span>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {getCurrencySymbol(currency)}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amounts[p.userId] ?? ""}
              onChange={(e) => onAmountChange(p.userId, e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2 text-right text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>
      ))}
      <div className="mt-2 border-t pt-2 text-right">
        <span
          className={`text-sm font-semibold ${
            Math.abs(remaining) < 0.01
              ? "text-teal-600"
              : "text-orange-600"
          }`}
        >
          {remaining >= 0 ? "Remaining" : "Over by"}: {getCurrencySymbol(currency)}
          {Math.abs(remaining).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function PercentageSplitPanel({
  participants,
  percentages,
  onPercentChange,
}: {
  participants: { userId: Id<"users">; name: string }[];
  percentages: Record<string, string>;
  onPercentChange: (uid: string, val: string) => void;
}) {
  const total = Object.values(percentages).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0
  );

  return (
    <div>
      {participants.map((p) => (
        <div key={p.userId} className="flex items-center gap-3 py-2.5">
          <span className="flex-1 text-sm font-medium">{p.name}</span>
          <div className="relative w-24">
            <input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              max="100"
              value={percentages[p.userId] ?? ""}
              onChange={(e) => onPercentChange(p.userId, e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-3 pr-7 text-right text-sm focus:border-teal-600 focus:outline-none"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
        </div>
      ))}
      <div className="mt-2 border-t pt-2 text-right">
        <span
          className={`text-sm font-semibold ${
            Math.abs(total - 100) < 0.01
              ? "text-teal-600"
              : "text-orange-600"
          }`}
        >
          Total: {total.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function SharesSplitPanel({
  participants,
  shares,
  onShareChange,
  totalAmount,
  currency,
}: {
  participants: { userId: Id<"users">; name: string }[];
  shares: Record<string, string>;
  onShareChange: (uid: string, val: string) => void;
  totalAmount: number;
  currency: string;
}) {
  const totalShares = Object.values(shares).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0
  );

  return (
    <div>
      {participants.map((p) => {
        const sh = parseFloat(shares[p.userId] ?? "0") || 0;
        const perShare =
          totalShares > 0 ? (totalAmount * sh) / totalShares : 0;
        return (
          <div key={p.userId} className="flex items-center gap-3 py-2.5">
            <span className="flex-1 text-sm font-medium">{p.name}</span>
            <span className="text-xs text-muted-foreground">
              {getCurrencySymbol(currency)}
              {perShare.toFixed(2)}
            </span>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              value={shares[p.userId] ?? ""}
              onChange={(e) => onShareChange(p.userId, e.target.value)}
              placeholder="0"
              className="w-16 rounded-lg border border-border bg-background py-1.5 px-2 text-center text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
        );
      })}
      <div className="mt-2 border-t pt-2 text-right">
        <span className="text-sm text-muted-foreground">
          Total shares: {totalShares}
        </span>
      </div>
    </div>
  );
}
