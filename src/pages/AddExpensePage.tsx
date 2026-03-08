import { useState, useMemo, useEffect } from "react";
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
  Plus,
} from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { GroupIcon } from "@/components/shared/GroupIcon";

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

interface Person {
  userId: Id<"users">;
  name: string;
  avatarUrl?: string | null;
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

export function AddExpensePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) ?? {};

  // Whether we need a selection screen first
  const needsSelection = !state.groupId && !state.friendId;

  // Whether we've moved past the selection screen
  const [formShown, setFormShown] = useState(!needsSelection);

  // Active group context: used for getGroup query + mutation groupId
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    state.groupId ?? null
  );

  // Group chip display: true = show group as one chip
  // User can clear it to switch to individual member chips
  const [showGroupChip, setShowGroupChip] = useState<boolean>(!!state.groupId);

  // Individual participant chips (non-viewer people)
  const [withPeople, setWithPeople] = useState<Person[]>([]);

  // Selection screen: people being assembled before confirming
  const [selectionPeople, setSelectionPeople] = useState<Person[]>([]);
  const [selectionSearch, setSelectionSearch] = useState("");

  // Sheet states
  const [showPayerSheet, setShowPayerSheet] = useState(false);
  const [showSplitSheet, setShowSplitSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showNotesSheet, setShowNotesSheet] = useState(false);

  // Form fields
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
  const [payerId, setPayerId] = useState<Id<"users"> | null>(null);

  // Split state
  const [equalIncluded, setEqualIncluded] = useState<Set<string>>(new Set());
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [sharesMap, setSharesMap] = useState<Record<string, string>>({});

  // ─── Queries ────────────────────────────────────────────────────────────────

  const viewer = useQuery(api.users.getViewer);
  const addExpense = useMutation(api.expenses.addExpense);

  const group = useQuery(
    api.groups.getGroup,
    activeGroupId ? { groupId: activeGroupId as Id<"groups"> } : "skip"
  );

  const friendDetail = useQuery(
    api.friends.getFriendDetail,
    state.friendId ? { friendId: state.friendId as Id<"users"> } : "skip"
  );

  // Selection screen queries (also used when navigating back to edit participants)
  const friendsData = useQuery(
    api.friends.getMyFriends,
    !formShown ? {} : "skip"
  );
  const groupsData = useQuery(
    api.groups.getMyGroups,
    !formShown && needsSelection ? {} : "skip"
  );

  // ─── Init effects ────────────────────────────────────────────────────────────

  // When navigating from FriendPage (state.friendId), init withPeople from friendDetail
  useEffect(() => {
    if (friendDetail && state.friendId && withPeople.length === 0) {
      setWithPeople([
        {
          userId: friendDetail.friend._id,
          name: friendDetail.friend.name,
          avatarUrl: friendDetail.friend.avatarUrl,
        },
      ]);
    }
  }, [friendDetail?.friend._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derived: participants ────────────────────────────────────────────────────

  const participants = useMemo(() => {
    if (!viewer) return [];

    if (showGroupChip && group) {
      return group.members.map((m) => ({
        userId: m.userId,
        name: m.userId === viewer._id ? "You" : m.name,
        avatarUrl: m.avatarUrl,
      }));
    }

    // Individual chip mode
    return [
      { userId: viewer._id, name: "You", avatarUrl: viewer.avatarUrl },
      ...withPeople.filter((p) => p.userId !== viewer._id),
    ];
  }, [viewer, group, showGroupChip, withPeople]);

  // Sync equalIncluded whenever participants change
  const participantIds = participants.map((p) => p.userId).join(",");
  useEffect(() => {
    if (participants.length > 0) {
      setEqualIncluded(new Set(participants.map((p) => p.userId)));
    }
  }, [participantIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Other derived ───────────────────────────────────────────────────────────

  const effectiveCurrency =
    currency ?? group?.defaultCurrency ?? viewer?.defaultCurrency ?? "INR";

  const effectivePayerId = payerId ?? viewer?._id ?? null;

  const amount = parseFloat(amountStr) || 0;

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

  // ─── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!viewer || !effectivePayerId || amount <= 0 || !description.trim()) return;

    setSaving(true);
    try {
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
          .filter((p) => (parseFloat(percentages[p.userId] ?? "0") || 0) > 0)
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
        groupId: activeGroupId ? (activeGroupId as Id<"groups">) : undefined,
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  const canSave =
    description.trim().length > 0 &&
    amount > 0 &&
    effectivePayerId &&
    participants.length >= 2 &&
    !saving;

  // ── Selection Screen (also shown when editing participants from the form) ─────
  if (!formShown) {
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

    function toggleSelectionPerson(friend: {
      friendId: string;
      name: string;
      avatarUrl?: string | null;
    }) {
      setSelectionPeople((prev) => {
        const exists = prev.some((p) => p.userId === friend.friendId);
        if (exists) return prev.filter((p) => p.userId !== friend.friendId);
        return [
          ...prev,
          { userId: friend.friendId as Id<"users">, name: friend.name, avatarUrl: friend.avatarUrl },
        ];
      });
    }

    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-md flex flex-col h-dvh">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 pt-[env(safe-area-inset-top)] shrink-0">
            <button
              onClick={() => {
                // If we navigated back from the form to edit, go back to the form
                if (!needsSelection) {
                  setFormShown(true);
                } else {
                  navigate(-1);
                }
              }}
              className="rounded-full p-2 text-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold">Add an expense</h1>
            <div className="w-14" />
          </div>

          {/* With bar: chips + search */}
          <div className="border-b border-border px-4 py-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">
                With you and:
              </span>
              {/* Selected person chips */}
              {selectionPeople.map((p) => (
                <span
                  key={p.userId}
                  className="flex items-center gap-1 rounded-full bg-brand/10 border border-brand/30 pl-2 pr-1 py-0.5 text-xs font-medium text-brand"
                >
                  {p.name}
                  <button
                    onClick={() =>
                      setSelectionPeople((prev) =>
                        prev.filter((x) => x.userId !== p.userId)
                      )
                    }
                    className="rounded-full p-0.5 hover:bg-brand/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={
                  selectionPeople.length === 0
                    ? "Enter names, emails, or phone numbers"
                    : "Add more..."
                }
                value={selectionSearch}
                onChange={(e) => setSelectionSearch(e.target.value)}
                className="flex-1 min-w-[120px] bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pb-24">
              {/* Recent friends */}
              {filteredFriends.length > 0 && (
                <div>
                  <h2 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent
                  </h2>
                  {filteredFriends.map((friend) => {
                    const isSelected = selectionPeople.some(
                      (p) => p.userId === friend.friendId
                    );
                    return (
                      <button
                        key={friend.friendId}
                        onClick={() => toggleSelectionPerson(friend)}
                        className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                      >
                        <UserAvatar
                          name={friend.name}
                          avatarUrl={friend.avatarUrl}
                        />
                        <span className="flex-1 text-left text-sm font-medium">
                          {friend.name}
                        </span>
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-brand bg-brand"
                              : "border-border"
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-brand-foreground" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Groups */}
              {filteredGroups.length > 0 && (
                <div>
                  <h2 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Groups
                  </h2>
                  {filteredGroups.map((g) => (
                    <button
                      key={g._id}
                      onClick={() => {
                        setActiveGroupId(g._id);
                        setShowGroupChip(true);
                        setFormShown(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <GroupIcon type={g.type} />
                      <span className="flex-1 text-left text-sm font-medium">
                        {g.name}
                      </span>
                      <div className="h-5 w-5 rounded-full border-2 border-border" />
                    </button>
                  ))}
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

          {/* Continue button */}
          {selectionPeople.length > 0 && (
            <div className="shrink-0 border-t border-border px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <button
                onClick={() => {
                  setWithPeople(selectionPeople);
                  setFormShown(true);
                }}
                className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-brand-foreground"
              >
                {needsSelection ? "Continue" : "Done"} with {selectionPeople.length}{" "}
                {selectionPeople.length === 1 ? "person" : "people"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Expense Form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 pt-[env(safe-area-inset-top)]">
          <button
            onClick={() => {
              if (needsSelection && formShown) {
                setFormShown(false);
                setActiveGroupId(null);
                setShowGroupChip(false);
                setWithPeople([]);
                setSelectionPeople([]);
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
            className="rounded-full px-4 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand-light disabled:text-muted-foreground disabled:hover:bg-transparent"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* "With" chip bar (editable) */}
        <div className="px-4 py-2 border-b border-border">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* "You" chip — fixed, non-removable */}
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
              You
            </span>

            {/* Group chip */}
            {showGroupChip && group && (
              <span className="flex items-center gap-1 rounded-full bg-brand/10 border border-brand/30 pl-2.5 pr-1 py-1 text-xs font-medium text-brand">
                {group.name}
                <button
                  onClick={() => {
                    setShowGroupChip(false);
                    // Expand group to individual member chips
                    if (group && viewer) {
                      setWithPeople(
                        group.members
                          .filter((m) => m.userId !== viewer._id)
                          .map((m) => ({
                            userId: m.userId,
                            name: m.name,
                            avatarUrl: m.avatarUrl,
                          }))
                      );
                    }
                  }}
                  className="rounded-full p-0.5 hover:bg-brand/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Individual person chips */}
            {!showGroupChip &&
              withPeople.map((p) => (
                <span
                  key={p.userId}
                  className="flex items-center gap-1 rounded-full bg-muted pl-2.5 pr-1 py-1 text-xs font-medium text-foreground"
                >
                  {p.name}
                  <button
                    onClick={() =>
                      setWithPeople((prev) =>
                        prev.filter((x) => x.userId !== p.userId)
                      )
                    }
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

            {/* Add button — goes back to the selection screen to edit */}
            <button
              onClick={() => {
                setSelectionPeople([...withPeople]);
                setSelectionSearch("");
                setFormShown(false);
              }}
              className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-3">
          <input
            type="text"
            placeholder="What was this expense for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border-b border-border bg-transparent pb-2 text-lg font-medium placeholder:text-muted-foreground focus:border-brand focus:outline-none"
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
              className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-lg font-semibold placeholder:text-muted-foreground focus:border-brand focus:outline-none"
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
              className="rounded-full border border-border bg-background py-1.5 pl-8 pr-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <select
            value={effectiveCurrency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
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
                    setPayerId(p.userId as Id<"users">);
                    setShowPayerSheet(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                >
                  <UserAvatar name={p.name} avatarUrl={p.avatarUrl} />
                  <span className="flex-1 text-left text-sm font-medium">
                    {p.name}
                  </span>
                  {p.userId === effectivePayerId && (
                    <Check className="h-5 w-5 text-brand" />
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
                      ? "border-brand bg-brand text-white"
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
                className="w-full rounded-full bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
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
                        ? "border-brand bg-brand-light"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        category === cat.id
                          ? "text-brand"
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
                className="w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none"
              />
              <button
                onClick={() => setShowNotesSheet(false)}
                className="mt-3 w-full rounded-full bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
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

// ─── Split Panels ─────────────────────────────────────────────────────────────

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
        <label key={p.userId} className="flex items-center gap-3 py-2.5">
          <input
            type="checkbox"
            checked={included.has(p.userId)}
            onChange={() => onToggle(p.userId)}
            className="h-4 w-4 rounded border-border accent-brand"
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
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2 text-right text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      ))}
      <div className="mt-2 border-t pt-2 text-right">
        <span
          className={`text-sm font-semibold ${
            Math.abs(remaining) < 0.01 ? "text-positive" : "text-negative"
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
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-3 pr-7 text-right text-sm focus:border-brand focus:outline-none"
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
            Math.abs(total - 100) < 0.01 ? "text-positive" : "text-negative"
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
              className="w-16 rounded-lg border border-border bg-background py-1.5 px-2 text-center text-sm focus:border-brand focus:outline-none"
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
