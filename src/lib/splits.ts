import { Id } from "../../convex/_generated/dataModel";

export interface SplitInput {
  userId: Id<"users">;
  paidAmount: number;
  owedAmount: number;
}

interface Participant {
  userId: Id<"users">;
  included: boolean;
}

/**
 * Round to 2 decimal places.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Distribute remainder cents to the first participants to ensure sum matches total.
 */
function distributeRemainder(
  amounts: number[],
  total: number
): number[] {
  const result = amounts.map((a) => round2(a));
  let diff = round2(total - result.reduce((s, a) => s + a, 0));

  // Distribute penny by penny to first participants
  let i = 0;
  while (Math.abs(diff) >= 0.005 && i < result.length) {
    if (diff > 0) {
      result[i] = round2(result[i] + 0.01);
      diff = round2(diff - 0.01);
    } else {
      result[i] = round2(result[i] - 0.01);
      diff = round2(diff + 0.01);
    }
    i++;
  }

  return result;
}

/**
 * Build a payer map (userId → paidAmount). If multiPayers is not provided,
 * the single payerUserId pays the full amount.
 */
function buildPayerMap(
  totalAmount: number,
  payerUserId: Id<"users">,
  multiPayers?: { userId: Id<"users">; amount: number }[]
): Map<string, number> {
  const payerMap = new Map<string, number>();
  if (multiPayers && multiPayers.length > 0) {
    for (const p of multiPayers) {
      payerMap.set(p.userId, round2(p.amount));
    }
  } else {
    payerMap.set(payerUserId, round2(totalAmount));
  }
  return payerMap;
}

/**
 * Combine paidAmounts and owedAmounts into SplitInput array.
 * Ensures every user who paid or owes is included.
 */
function combineSplits(
  participants: Participant[],
  owedAmounts: number[],
  payerMap: Map<string, number>
): SplitInput[] {
  const allUserIds = new Set<string>();
  const includedParticipants = participants.filter((p) => p.included);

  for (const p of includedParticipants) allUserIds.add(p.userId);
  for (const [uid] of payerMap) allUserIds.add(uid);

  const splits: SplitInput[] = [];

  let owedIdx = 0;
  for (const uid of allUserIds) {
    const paidAmount = payerMap.get(uid) ?? 0;
    // Find if this user is in the included participants
    const isIncluded = includedParticipants.some((p) => p.userId === uid);
    const owedAmount = isIncluded ? owedAmounts[owedIdx++] ?? 0 : 0;

    splits.push({
      userId: uid as Id<"users">,
      paidAmount: round2(paidAmount),
      owedAmount: round2(owedAmount),
    });
  }

  return splits;
}

/**
 * Compute an equal split among included participants.
 */
export function computeEqualSplit(
  totalAmount: number,
  participants: Participant[],
  payerUserId: Id<"users">,
  multiPayers?: { userId: Id<"users">; amount: number }[]
): SplitInput[] {
  const included = participants.filter((p) => p.included);
  if (included.length === 0) return [];

  const perPerson = totalAmount / included.length;
  const owedAmounts = distributeRemainder(
    included.map(() => perPerson),
    totalAmount
  );

  const payerMap = buildPayerMap(totalAmount, payerUserId, multiPayers);
  return combineSplits(participants, owedAmounts, payerMap);
}

/**
 * Compute an exact-amount split.
 */
export function computeExactSplit(
  totalAmount: number,
  exactAmounts: { userId: Id<"users">; amount: number }[],
  payerUserId: Id<"users">,
  multiPayers?: { userId: Id<"users">; amount: number }[]
): SplitInput[] {
  const participants: Participant[] = exactAmounts.map((e) => ({
    userId: e.userId,
    included: true,
  }));
  const owedAmounts = exactAmounts.map((e) => round2(e.amount));
  const payerMap = buildPayerMap(totalAmount, payerUserId, multiPayers);
  return combineSplits(participants, owedAmounts, payerMap);
}

/**
 * Compute a percentage-based split.
 */
export function computePercentageSplit(
  totalAmount: number,
  percentages: { userId: Id<"users">; percentage: number }[],
  payerUserId: Id<"users">,
  multiPayers?: { userId: Id<"users">; amount: number }[]
): SplitInput[] {
  const participants: Participant[] = percentages.map((p) => ({
    userId: p.userId,
    included: true,
  }));
  const rawAmounts = percentages.map(
    (p) => (totalAmount * p.percentage) / 100
  );
  const owedAmounts = distributeRemainder(rawAmounts, totalAmount);
  const payerMap = buildPayerMap(totalAmount, payerUserId, multiPayers);
  return combineSplits(participants, owedAmounts, payerMap);
}

/**
 * Compute a shares-based split.
 */
export function computeSharesSplit(
  totalAmount: number,
  shares: { userId: Id<"users">; shares: number }[],
  payerUserId: Id<"users">,
  multiPayers?: { userId: Id<"users">; amount: number }[]
): SplitInput[] {
  const totalShares = shares.reduce((sum, s) => sum + s.shares, 0);
  if (totalShares === 0) return [];

  const participants: Participant[] = shares.map((s) => ({
    userId: s.userId,
    included: true,
  }));
  const rawAmounts = shares.map(
    (s) => (totalAmount * s.shares) / totalShares
  );
  const owedAmounts = distributeRemainder(rawAmounts, totalAmount);
  const payerMap = buildPayerMap(totalAmount, payerUserId, multiPayers);
  return combineSplits(participants, owedAmounts, payerMap);
}
