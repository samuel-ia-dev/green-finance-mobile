import { buildInsights } from "@/utils/insights";
import { Transaction } from "@/types/finance";

const currentMonthTransactions: Transaction[] = [
  {
    id: "1",
    userId: "user-1",
    type: "expense",
    amount: 240,
    categoryId: "food",
    categoryName: "Alimentação",
    description: "Mercado",
    date: "2026-03-02",
    isRecurring: false,
    createdAt: "2026-03-02",
    updatedAt: "2026-03-02"
  },
  {
    id: "2",
    userId: "user-1",
    type: "expense",
    amount: 120,
    categoryId: "housing",
    categoryName: "Moradia",
    description: "Internet",
    date: "2026-03-03",
    isRecurring: true,
    recurringFrequency: "monthly",
    recurringStartDate: "2026-01-03",
    parentRecurringId: "rec-1",
    createdAt: "2026-03-03",
    updatedAt: "2026-03-03"
  }
];

const previousMonthTransactions: Transaction[] = [
  {
    id: "3",
    userId: "user-1",
    type: "expense",
    amount: 200,
    categoryId: "food",
    categoryName: "Alimentação",
    description: "Mercado",
    date: "2026-02-02",
    isRecurring: false,
    createdAt: "2026-02-02",
    updatedAt: "2026-02-02"
  }
];

describe("insights", () => {
  it("generates spending and recurring insights", () => {
    const insights = buildInsights(currentMonthTransactions, previousMonthTransactions, "2026-03");

    expect(insights[0]).toContain("20%");
    expect(insights.some((item) => item.includes("Alimentação"))).toBe(true);
    expect(insights.some((item) => item.includes("recorrentes"))).toBe(true);
  });

  it("returns top category even without previous month baseline", () => {
    const insights = buildInsights(currentMonthTransactions, [], "2026-03");

    expect(insights.some((item) => item.includes("maior categoria"))).toBe(true);
  });

  it("returns empty when there are no current month expenses", () => {
    expect(buildInsights([], previousMonthTransactions, "2026-03")).toEqual([]);
  });

  it("covers negative spending deltas", () => {
    const insights = buildInsights(
      [
        {
          ...currentMonthTransactions[0],
          amount: 100
        }
      ],
      previousMonthTransactions,
      "2026-03"
    );

    expect(insights.some((item) => item.includes("menos"))).toBe(true);
  });

  it("ignores categories with zero delta", () => {
    const insights = buildInsights(
      [
        {
          ...currentMonthTransactions[0],
          amount: 200
        }
      ],
      previousMonthTransactions,
      "2026-03"
    );

    expect(insights.some((item) => item.includes("0%"))).toBe(false);
  });
});
