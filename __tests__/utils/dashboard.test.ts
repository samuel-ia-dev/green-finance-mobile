import { buildDashboardSummary } from "@/utils/dashboard";
import { Goal, Transaction } from "@/types/finance";

const transactions: Transaction[] = [
  {
    id: "1",
    userId: "user-1",
    type: "income",
    amount: 5000,
    categoryId: "salary",
    categoryName: "Salário",
    description: "Salário",
    date: "2026-03-01",
    isRecurring: false,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01"
  },
  {
    id: "2",
    userId: "user-1",
    type: "expense",
    amount: 200,
    categoryId: "food",
    categoryName: "Alimentação",
    description: "Mercado",
    date: "2026-03-02",
    isRecurring: false,
    createdAt: "2026-03-02",
    updatedAt: "2026-03-02"
  },
  {
    id: "3",
    userId: "user-1",
    type: "expense",
    amount: 120,
    categoryId: "housing",
    categoryName: "Moradia",
    description: "Internet",
    date: "2026-03-10",
    isRecurring: true,
    recurringFrequency: "monthly",
    recurringStartDate: "2026-01-10",
    parentRecurringId: "rec-1",
    createdAt: "2026-03-10",
    updatedAt: "2026-03-10"
  }
];

const goals: Goal[] = [
  {
    id: "goal-1",
    userId: "user-1",
    name: "Reserva",
    targetAmount: 10000,
    currentAmount: 3500,
    deadline: "2026-12-01",
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01"
  }
];

describe("dashboard summary", () => {
  it("calculates totals, recurring block and financial health", () => {
    const summary = buildDashboardSummary(transactions, goals, "2026-03");

    expect(summary.balance).toBe(4680);
    expect(summary.monthlyIncome).toBe(5000);
    expect(summary.monthlyExpenses).toBe(320);
    expect(summary.recurringTotal).toBe(120);
    expect(summary.recentTransactions).toHaveLength(3);
    expect(summary.healthStatus).toBe("healthy");
    expect(summary.goalProgress[0].percent).toBe(35);
  });

  it("keeps the balance restricted to the selected month", () => {
    const summary = buildDashboardSummary(
      [
        ...transactions,
        {
          ...transactions[1],
          id: "future-expense",
          amount: 999,
          date: "2026-04-05"
        }
      ],
      goals,
      "2026-03"
    );

    expect(summary.balance).toBe(4680);
  });

  it("covers completed goals and empty monthly expenses", () => {
    const summary = buildDashboardSummary(
      [
        {
          ...transactions[0],
          id: "4",
          amount: 1000,
          date: "2026-04-01"
        }
      ],
      [
        {
          ...goals[0],
          currentAmount: 10000
        }
      ],
      "2026-04"
    );

    expect(summary.monthlyExpenses).toBe(0);
    expect(summary.goalProgress[0].status).toBe("completed");
  });

  it("covers attention and critical health states", () => {
    const attention = buildDashboardSummary(
      [
        {
          ...transactions[0],
          amount: 1000,
          date: "2026-05-01"
        },
        {
          ...transactions[1],
          id: "5",
          amount: 800,
          date: "2026-05-02"
        }
      ],
      [],
      "2026-05"
    );

    const critical = buildDashboardSummary(
      [
        {
          ...transactions[0],
          amount: 1000,
          date: "2026-06-01"
        },
        {
          ...transactions[1],
          id: "6",
          amount: 950,
          date: "2026-06-02"
        }
      ],
      [],
      "2026-06"
    );

    expect(attention.healthStatus).toBe("attention");
    expect(critical.healthStatus).toBe("critical");
  });

  it("covers on-track goal status", () => {
    const summary = buildDashboardSummary(transactions, [
      {
        ...goals[0],
        currentAmount: 6000
      }
    ], "2026-03");

    expect(summary.goalProgress[0].status).toBe("on-track");
  });

  it("decreases open monthly expenses when a bill is marked as paid", () => {
    const summary = buildDashboardSummary(
      [
        transactions[0],
        {
          ...transactions[1],
          isPaid: true
        },
        transactions[2]
      ],
      goals,
      "2026-03"
    );

    expect(summary.monthlyExpenses).toBe(120);
    expect(summary.recurringTotal).toBe(120);
    expect(summary.categoryBreakdown).toEqual([
      expect.objectContaining({
        categoryName: "Moradia",
        amount: 120,
        percent: 100
      })
    ]);
  });

  it("keeps category percentage at zero when the month has zero-value expenses", () => {
    const summary = buildDashboardSummary(
      [
        {
          ...transactions[1],
          id: "zero-expense",
          amount: 0,
          date: "2026-07-02"
        }
      ],
      [],
      "2026-07"
    );

    expect(summary.categoryBreakdown[0].percent).toBe(0);
  });
});
