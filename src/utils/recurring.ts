import { RecurringConfig, RecurringFrequency, Transaction } from "@/types/finance";

type BuildRecurringInstallmentsInput = {
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  config: RecurringConfig;
  existingDates?: string[];
  parentRecurringId?: string;
  referenceDate?: Date;
  userId: string;
};

type ShouldGenerateRecurringInput = {
  frequency: RecurringFrequency;
  currentDate: string;
  lastGeneratedDate: string;
};

type RecurringSeriesInput = Pick<
  Transaction,
  "amount" | "categoryId" | "date" | "description" | "id" | "isRecurring" | "parentRecurringId" | "recurringFrequency" | "recurringStartDate" | "type" | "userId"
>;

function addStep(date: Date, frequency: RecurringFrequency) {
  const next = new Date(date.getTime());
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  }
  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  }
  if (frequency === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveRecurringEndDate(startDate: string, endDate?: string) {
  const normalizedEndDate = endDate?.trim();

  if (normalizedEndDate) {
    return normalizedEndDate;
  }

  return undefined;
}

export function resolveRecurringGenerationHorizon(startDate: string, endDate?: string, referenceDate = new Date()) {
  const explicitEndDate = resolveRecurringEndDate(startDate, endDate);

  if (explicitEndDate) {
    return explicitEndDate;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const minimumYear = start.getFullYear();
  const referenceYear = referenceDate.getFullYear() + 1;
  return `${Math.max(minimumYear, referenceYear)}-12-31`;
}

export function buildRecurringSeriesSignature(input: RecurringSeriesInput) {
  if (!input.isRecurring || input.type !== "expense") {
    return null;
  }

  return [
    input.userId,
    input.recurringStartDate ?? input.date,
    input.recurringFrequency ?? "",
    input.categoryId,
    input.description.trim().toLowerCase(),
    input.amount
  ].join("|");
}

export function isSameRecurringSeries(left: RecurringSeriesInput, right: RecurringSeriesInput) {
  if (!left.isRecurring || !right.isRecurring || left.type !== "expense" || right.type !== "expense") {
    return false;
  }

  if (left.id === right.id) {
    return true;
  }

  if (left.parentRecurringId && right.parentRecurringId && left.parentRecurringId === right.parentRecurringId) {
    return true;
  }

  if (left.parentRecurringId && left.parentRecurringId === right.id) {
    return true;
  }

  if (right.parentRecurringId && right.parentRecurringId === left.id) {
    return true;
  }

  const leftSignature = buildRecurringSeriesSignature(left);
  const rightSignature = buildRecurringSeriesSignature(right);

  return Boolean(leftSignature && rightSignature && leftSignature === rightSignature);
}

export function buildRecurringInstallments(input: BuildRecurringInstallmentsInput): Transaction[] {
  const start = new Date(`${input.config.startDate}T00:00:00`);
  const resolvedEndDate = resolveRecurringGenerationHorizon(input.config.startDate, input.config.endDate, input.referenceDate);
  const maxDate = new Date(`${resolvedEndDate}T00:00:00`);
  const existingDates = new Set(input.existingDates ?? []);
  const transactions: Transaction[] = [];

  for (let cursor = new Date(start.getTime()); cursor <= maxDate; cursor = addStep(cursor, input.config.frequency)) {
    const date = toDateString(cursor);
    if (existingDates.has(date)) {
      continue;
    }

    transactions.push({
      id: `${input.parentRecurringId ?? "recurring"}-${date}`,
      userId: input.userId,
      type: "expense",
      amount: input.amount,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      description: input.description,
      date,
      isRecurring: true,
      recurringFrequency: input.config.frequency,
      recurringStartDate: input.config.startDate,
      recurringEndDate: resolveRecurringEndDate(input.config.startDate, input.config.endDate),
      parentRecurringId: input.parentRecurringId,
      isPaid: false,
      createdAt: date,
      updatedAt: date
    });
  }

  return transactions;
}

export function shouldGenerateRecurringInstance(input: ShouldGenerateRecurringInput) {
  const current = new Date(`${input.currentDate}T00:00:00`);
  const lastGenerated = new Date(`${input.lastGeneratedDate}T00:00:00`);
  const differenceMs = current.getTime() - lastGenerated.getTime();
  const differenceDays = differenceMs / (1000 * 60 * 60 * 24);

  if (input.frequency === "weekly") {
    return differenceDays >= 7;
  }
  if (input.frequency === "monthly") {
    return current.getMonth() !== lastGenerated.getMonth() || current.getFullYear() !== lastGenerated.getFullYear();
  }
  return current.getFullYear() !== lastGenerated.getFullYear();
}
