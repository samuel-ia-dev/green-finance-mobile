import { filterTransactions } from "@/utils/historyFilters";
import { Transaction } from "@/types/finance";

const transactions: Transaction[] = [
  {
    id: "1",
    userId: "user-1",
    type: "expense",
    amount: 120,
    categoryId: "food",
    categoryName: "Alimentação",
    description: "Mercado",
    date: "2026-03-01",
    isRecurring: false,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01"
  },
  {
    id: "2",
    userId: "user-1",
    type: "income",
    amount: 3000,
    categoryId: "salary",
    categoryName: "Salário",
    description: "Empresa",
    date: "2026-02-25",
    isRecurring: false,
    createdAt: "2026-02-25",
    updatedAt: "2026-02-25"
  }
];

describe("history filters", () => {
  it("filters by month", () => {
    expect(filterTransactions(transactions, { month: "2026-03" })).toHaveLength(1);
  });

  it("filters by category and type", () => {
    expect(
      filterTransactions(transactions, {
        categoryId: "food",
        type: "expense"
      })
    ).toEqual([transactions[0]]);
  });

  it("filters by search text and returns empty state when nothing matches", () => {
    expect(filterTransactions(transactions, { search: "empresa" })).toEqual([transactions[1]]);
    expect(filterTransactions(transactions, { search: "academia" })).toEqual([]);
  });

  it("returns sorted transactions when no filter is provided", () => {
    const result = filterTransactions(transactions, {});
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
  });

  it("drops transactions when month or type do not match", () => {
    expect(filterTransactions(transactions, { month: "2026-01" })).toEqual([]);
    expect(filterTransactions(transactions, { type: "income", month: "2026-03" })).toEqual([]);
  });
});
