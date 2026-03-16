import { create } from "zustand";
import { Category, DashboardSummary, FinanceHydrationPayload, Goal, Transaction, UserSettings } from "@/types/finance";
import { isSameRecurringSeries } from "@/utils/recurring";
import { buildDashboardSummary } from "@/utils/dashboard";
import { getMonthKey } from "@/utils/format";

const defaultSettings: UserSettings = {
  theme: "system",
  currency: "BRL"
};

const emptyDashboard: DashboardSummary = {
  balance: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  recurringTotal: 0,
  healthStatus: "healthy",
  categoryBreakdown: [],
  recentTransactions: [],
  recurringTransactions: [],
  goalProgress: [],
  insights: []
};

type FinanceState = {
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  settings: UserSettings;
  dashboard: DashboardSummary;
  editingTransaction: Transaction | null;
  isSyncing: boolean;
  hydrate: (payload: FinanceHydrationPayload) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setCategories: (categories: Category[]) => void;
  setGoals: (goals: Goal[]) => void;
  setSettings: (settings: Partial<UserSettings>) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransactionLocal: (id: string, input: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  setEditingTransaction: (transaction: Transaction | null) => void;
  clearEditingTransaction: () => void;
  setSyncing: (value: boolean) => void;
  reset: () => void;
};

function computeDashboard(transactions: Transaction[], goals: Goal[]) {
  return buildDashboardSummary(transactions, goals, getMonthKey());
}

function shouldReplaceTransaction(next: Transaction, current: Transaction) {
  return next.updatedAt > current.updatedAt || (next.updatedAt === current.updatedAt && next.createdAt > current.createdAt);
}

function findDuplicateTransactionIndex(transactions: Transaction[], candidate: Transaction) {
  return transactions.findIndex((current) => {
    if (current.isRecurring && candidate.isRecurring && current.type === "expense" && candidate.type === "expense") {
      return current.date === candidate.date && isSameRecurringSeries(current, candidate);
    }

    return current.id === candidate.id;
  });
}

function dedupeTransactions(transactions: Transaction[]) {
  const uniqueTransactions: Transaction[] = [];

  transactions.forEach((transaction) => {
    const duplicateIndex = findDuplicateTransactionIndex(uniqueTransactions, transaction);

    if (duplicateIndex === -1) {
      uniqueTransactions.push(transaction);
      return;
    }

    const current = uniqueTransactions[duplicateIndex];

    if (shouldReplaceTransaction(transaction, current)) {
      uniqueTransactions[duplicateIndex] = transaction;
    }
  });

  return uniqueTransactions;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  categories: [],
  goals: [],
  settings: defaultSettings,
  dashboard: emptyDashboard,
  editingTransaction: null,
  isSyncing: false,

  hydrate: (payload) => {
    const transactions = dedupeTransactions(payload.transactions);

    set({
      ...payload,
      transactions,
      dashboard: computeDashboard(transactions, payload.goals)
    });
  },

  setTransactions: (transactions) =>
    set((state) => {
      const uniqueTransactions = dedupeTransactions(transactions);

      return {
        transactions: uniqueTransactions,
        dashboard: computeDashboard(uniqueTransactions, state.goals)
      };
    }),

  setCategories: (categories) => set({ categories }),

  setGoals: (goals) =>
    set((state) => ({
      goals,
      dashboard: computeDashboard(state.transactions, goals)
    })),

  setSettings: (settings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings
      }
    })),

  addTransaction: (transaction) =>
    set((state) => {
      const transactions = dedupeTransactions([transaction, ...state.transactions]);
      return {
        transactions,
        dashboard: computeDashboard(transactions, state.goals)
      };
    }),

  updateTransactionLocal: (id, input) =>
    set((state) => {
      const transactions = dedupeTransactions(
        state.transactions.map((transaction) =>
          transaction.id === id
            ? {
                ...transaction,
                ...input
              }
            : transaction
        )
      );
      return {
        transactions,
        dashboard: computeDashboard(transactions, state.goals)
      };
    }),

  removeTransaction: (id) =>
    set((state) => {
      const transactions = state.transactions.filter((transaction) => transaction.id !== id);
      return {
        transactions,
        dashboard: computeDashboard(transactions, state.goals)
      };
    }),

  setEditingTransaction: (transaction) => set({ editingTransaction: transaction }),

  clearEditingTransaction: () => set({ editingTransaction: null }),

  setSyncing: (value) => set({ isSyncing: value }),

  reset: () =>
    set({
      transactions: [],
      categories: [],
      goals: [],
      settings: defaultSettings,
      dashboard: emptyDashboard,
      editingTransaction: null,
      isSyncing: false
    })
}));
