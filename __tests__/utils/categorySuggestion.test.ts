import { suggestCategory } from "@/utils/categorySuggestion";
import { Transaction } from "@/types/finance";

const history: Transaction[] = [
  {
    id: "1",
    userId: "user-1",
    type: "expense",
    amount: 80,
    categoryId: "transport",
    categoryName: "Transporte",
    description: "Uber aeroporto",
    date: "2026-03-01",
    isRecurring: false,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01"
  }
];

describe("categorySuggestion", () => {
  it("suggests category using keywords and history", () => {
    expect(suggestCategory("Uber centro", history)).toBe("Transporte");
  });

  it("falls back to Outros when no keyword or history match exists", () => {
    expect(suggestCategory("Despesa genérica", [])).toBe("Outros");
  });

  it("uses transaction history when the keyword map does not match", () => {
    expect(
      suggestCategory("aeroporto urgente", [
        {
          ...history[0],
          description: "corrida urgente aeroporto",
          categoryName: "Transporte"
        }
      ])
    ).toBe("Transporte");
  });
});
