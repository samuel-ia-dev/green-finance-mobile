import { act } from "@testing-library/react-native";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Transaction } from "@/types/finance";

const transaction: Transaction = {
  id: "1",
  userId: "user-1",
  type: "expense",
  amount: 50,
  categoryId: "food",
  categoryName: "Alimentação",
  description: "Café",
  date: "2026-03-01",
  isRecurring: false,
  createdAt: "2026-03-01",
  updatedAt: "2026-03-01"
};

describe("useFinanceStore", () => {
  beforeEach(() => {
    useFinanceStore.getState().reset();
  });

  it("stores hydrated financial state", () => {
    act(() => {
      useFinanceStore.getState().hydrate({
        transactions: [transaction],
        categories: [],
        goals: [],
        settings: {
          theme: "dark",
          currency: "BRL"
        }
      });
    });

    expect(useFinanceStore.getState().transactions).toEqual([transaction]);
    expect(useFinanceStore.getState().settings.theme).toBe("dark");
  });

  it("adds and removes a transaction optimistically", () => {
    act(() => {
      useFinanceStore.getState().addTransaction(transaction);
      useFinanceStore.getState().removeTransaction("1");
    });

    expect(useFinanceStore.getState().transactions).toHaveLength(0);
  });

  it("does not duplicate a transaction when the same id is added more than once", () => {
    act(() => {
      useFinanceStore.getState().setTransactions([transaction]);
      useFinanceStore.getState().addTransaction({
        ...transaction,
        amount: 75,
        updatedAt: "2026-03-02"
      });
    });

    expect(useFinanceStore.getState().transactions).toHaveLength(1);
    expect(useFinanceStore.getState().transactions[0].amount).toBe(75);
  });

  it("deduplicates recurring entries from the same series and month", () => {
    act(() => {
      useFinanceStore.getState().setTransactions([
        {
          ...transaction,
          id: "root-1",
          date: "2026-04-10",
          isRecurring: true,
          updatedAt: "2026-04-10T08:00:00.000Z",
          createdAt: "2026-04-10T08:00:00.000Z"
        },
        {
          ...transaction,
          id: "rec-2",
          description: "Café duplicado",
          date: "2026-04-10",
          isRecurring: true,
          parentRecurringId: "root-1",
          updatedAt: "2026-04-10T09:00:00.000Z",
          createdAt: "2026-04-10T09:00:00.000Z"
        }
      ]);
    });

    expect(useFinanceStore.getState().transactions).toHaveLength(1);
    expect(useFinanceStore.getState().transactions[0]).toEqual(
      expect.objectContaining({
        id: "rec-2",
        description: "Café duplicado"
      })
    );
  });

  it("updates local state and toggles syncing", () => {
    act(() => {
      useFinanceStore.getState().setTransactions([
        transaction,
        {
          ...transaction,
          id: "2",
          description: "Jantar"
        }
      ]);
      useFinanceStore.getState().setCategories([
        {
          id: "food",
          userId: "user-1",
          name: "Alimentação",
          color: "#16A34A",
          icon: "restaurant-outline",
          createdAt: "2026-03-01",
          updatedAt: "2026-03-01"
        }
      ]);
      useFinanceStore.getState().setGoals([
        {
          id: "goal-1",
          userId: "user-1",
          name: "Reserva",
          targetAmount: 1000,
          currentAmount: 500,
          deadline: "2026-12-01",
          createdAt: "2026-03-01",
          updatedAt: "2026-03-01"
        }
      ]);
      useFinanceStore.getState().setSettings({ theme: "light" });
      useFinanceStore.getState().updateTransactionLocal("1", { description: "Almoço" });
      useFinanceStore.getState().updateTransactionLocal("999", { description: "Ignorado" });
      useFinanceStore.getState().setSyncing(true);
    });

    expect(useFinanceStore.getState().transactions[0].description).toBe("Almoço");
    expect(useFinanceStore.getState().categories).toHaveLength(1);
    expect(useFinanceStore.getState().goals).toHaveLength(1);
    expect(useFinanceStore.getState().settings.theme).toBe("light");
    expect(useFinanceStore.getState().isSyncing).toBe(true);
  });

  it("stores and clears the transaction being edited", () => {
    act(() => {
      useFinanceStore.getState().setEditingTransaction(transaction);
    });

    expect(useFinanceStore.getState().editingTransaction).toEqual(transaction);

    act(() => {
      useFinanceStore.getState().clearEditingTransaction();
    });

    expect(useFinanceStore.getState().editingTransaction).toBeNull();
  });
});
