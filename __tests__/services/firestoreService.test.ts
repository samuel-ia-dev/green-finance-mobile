import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, updateDoc, deleteDoc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { firestoreService } from "@/services/firestoreService";
import { FinanceHydrationPayload, Goal, TransactionInput } from "@/types/finance";

function mockJsonResponse(status: number, payload: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(payload ? JSON.stringify(payload) : "")
  });
}

function loadLocalFirestoreService(initialState?: FinanceHydrationPayload) {
  jest.resetModules();
  const cache = new Map<string, unknown>();

  if (initialState) {
    cache.set("green-finance-local-finance", initialState);
  }

  jest.doMock("@/services/firebase", () => ({
    db: null
  }));
  jest.doMock("@/services/cacheService", () => ({
    cacheService: {
      getItem: jest.fn(async (key: string, fallback: unknown) => (cache.has(key) ? cache.get(key) : fallback)),
      setItem: jest.fn(async (key: string, value: unknown) => {
        cache.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        cache.delete(key);
      })
    }
  }));

  let isolated: typeof import("@/services/firestoreService");
  jest.isolateModules(() => {
    isolated = require("@/services/firestoreService");
  });

  return {
    cache,
    firestoreService: isolated!.firestoreService
  };
}

describe("firestoreService", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    delete process.env.EXPO_PUBLIC_REMOTE_API_BASE_URL;
    (globalThis as typeof globalThis & { __GREEN_FINANCE_REMOTE_API_BASE_URL__?: string }).__GREEN_FINANCE_REMOTE_API_BASE_URL__ = "";
    global.fetch = jest.fn();
  });

  it("creates a transaction with timestamps and keeps open recurring series without a fixed end", async () => {
    (addDoc as jest.Mock).mockResolvedValueOnce({ id: "tx-1" });
    const batch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };
    (writeBatch as jest.Mock).mockReturnValueOnce(batch);
    const input: TransactionInput = {
      userId: "user-1",
      type: "expense",
      amount: 120,
      categoryId: "housing",
      categoryName: "Moradia",
      description: "Internet",
      date: "2026-03-10",
      isRecurring: true,
      recurringFrequency: "monthly",
      recurringStartDate: "2026-03-10"
    };

    const id = await firestoreService.createTransaction(input);
    const createdPayload = (addDoc as jest.Mock).mock.calls[0][1];

    expect(createdPayload.recurringEndDate).toBeUndefined();
    expect(batch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        date: "2027-12-10",
        recurringEndDate: undefined
      })
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
    expect(id).toBe("tx-1");
  });

  it("creates future recurring entries when an end date exists", async () => {
    (addDoc as jest.Mock).mockResolvedValue({ id: "tx-root" });
    const batch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };
    (writeBatch as jest.Mock).mockReturnValueOnce(batch);

    await firestoreService.createTransaction({
      userId: "user-1",
      type: "expense",
      amount: 89,
      categoryId: "health",
      categoryName: "Saúde",
      description: "Academia",
      date: "2026-03-10",
      isRecurring: true,
      recurringFrequency: "monthly",
      recurringStartDate: "2026-03-10",
      recurringEndDate: "2026-04-10"
    });

    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(batch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: "tx-root-2026-04-10",
        parentRecurringId: "tx-root",
        date: "2026-04-10"
      })
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it("creates a non recurring transaction without expanding the series", async () => {
    (addDoc as jest.Mock).mockResolvedValueOnce({ id: "tx-2" });

    await firestoreService.createTransaction({
      userId: "user-1",
      type: "income",
      amount: 500,
      categoryId: "salary",
      categoryName: "Salário",
      description: "Freela",
      date: "2026-03-10",
      isRecurring: false
    });

    expect(addDoc).toHaveBeenCalledTimes(1);
  });

  it("updates and deletes transactions", async () => {
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);
    (deleteDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await firestoreService.updateTransaction("tx-1", { description: "Internet fibra" });
    await firestoreService.deleteTransaction("tx-1");

    expect(updateDoc).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();
  });

  it("listens to transactions in real time", () => {
    const unsubscribe = firestoreService.subscribeToTransactions("user-1", jest.fn());

    expect(onSnapshot).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe("function");
  });

  it("listens to categories, goals and settings", () => {
    const settingsCallback = jest.fn();
    (onSnapshot as jest.Mock).mockImplementationOnce((_query, callback) => {
      callback({ docs: [] });
      return jest.fn();
    });
    firestoreService.subscribeToCategories("user-1", jest.fn());
    (onSnapshot as jest.Mock).mockImplementationOnce((_query, callback) => {
      callback({ docs: [] });
      return jest.fn();
    });
    firestoreService.subscribeToGoals("user-1", jest.fn());
    (onSnapshot as jest.Mock).mockImplementationOnce((_query, callback) => {
      callback({
        data: () => ({
          theme: "dark",
          currency: "BRL"
        })
      });
      return jest.fn();
    });
    firestoreService.subscribeToSettings("user-1", settingsCallback);

    expect(settingsCallback).toHaveBeenCalledWith({
      theme: "dark",
      currency: "BRL"
    });
  });

  it("handles missing snapshot data gracefully", () => {
    const categoryCallback = jest.fn();
    const settingsCallback = jest.fn();
    (onSnapshot as jest.Mock).mockImplementationOnce((_query, callback) => {
      callback({
        docs: [{ id: "cat-1" }]
      });
      return jest.fn();
    });
    firestoreService.subscribeToCategories("user-1", categoryCallback);

    (onSnapshot as jest.Mock).mockImplementationOnce((_query, callback) => {
      callback({});
      return jest.fn();
    });
    firestoreService.subscribeToSettings("user-1", settingsCallback);

    expect(categoryCallback).toHaveBeenCalledWith([{ id: "cat-1" }]);
    expect(settingsCallback).toHaveBeenCalledWith(null);
  });

  it("creates fallback ids when snapshot docs do not contain one", () => {
    const callback = jest.fn();
    (onSnapshot as jest.Mock).mockImplementationOnce((_query, next) => {
      next({
        docs: [{}]
      });
      return jest.fn();
    });

    firestoreService.subscribeToGoals("user-1", callback);

    expect(callback).toHaveBeenCalledWith([{ id: "mock-0" }]);
  });

  it("upserts user settings", async () => {
    (setDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await firestoreService.saveUserSettings("user-1", {
      theme: "dark",
      currency: "BRL"
    });

    expect(setDoc).toHaveBeenCalled();
  });

  it("creates and updates goals", async () => {
    (addDoc as jest.Mock).mockResolvedValueOnce({ id: "goal-1" });
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    const goal: Omit<Goal, "id" | "createdAt" | "updatedAt"> = {
      userId: "user-1",
      name: "Reserva",
      targetAmount: 10000,
      currentAmount: 1000,
      deadline: "2026-12-31"
    };

    const id = await firestoreService.createGoal(goal);
    await firestoreService.updateGoal("goal-1", { currentAmount: 2500 });

    expect(id).toBe("goal-1");
    expect(updateDoc).toHaveBeenCalled();
  });

  it("creates generated recurring transactions and seeds default categories", async () => {
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    const batch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };
    (writeBatch as jest.Mock).mockReturnValueOnce(batch);

    const id = await firestoreService.createGeneratedRecurringTransaction({
      userId: "user-1",
      type: "expense",
      amount: 89,
      categoryId: "health",
      categoryName: "Saúde",
      description: "Academia",
      date: "2026-03-10",
      isRecurring: true,
      recurringFrequency: "monthly",
      recurringStartDate: "2026-03-10",
      parentRecurringId: "root-1"
    });

    await firestoreService.ensureDefaultCategories("user-1");

    expect(id).toBe("root-1-2026-03-10");
    expect(batch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: "root-1-2026-03-10"
      })
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
    expect(setDoc).toHaveBeenCalled();
  });

  it("syncs transactions through the remote backend when firebase is not configured", async () => {
    (globalThis as typeof globalThis & { __GREEN_FINANCE_REMOTE_API_BASE_URL__?: string }).__GREEN_FINANCE_REMOTE_API_BASE_URL__ =
      "https://backend.example.com/api";
    const remoteState: FinanceHydrationPayload = {
      transactions: [],
      categories: [],
      goals: [],
      settings: {
        theme: "light",
        currency: "BRL",
        email: "remote@example.com"
      }
    };

    (global.fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/bootstrap")) {
        return mockJsonResponse(200, remoteState);
      }

      if (url.endsWith("/transactions/bulk-upsert")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        remoteState.transactions = body.items;
        return mockJsonResponse(204, null);
      }

      return mockJsonResponse(404, { error: "not-found" });
    });

    jest.resetModules();
    jest.doMock("@/services/firebase", () => ({
      db: null
    }));
    jest.doMock("@/services/cacheService", () => ({
      cacheService: {
        getItem: jest.fn(async (key: string, fallback: unknown) =>
          key === "green-finance.remote-session"
            ? {
                token: "session-remote",
                user: {
                  uid: "remote-user",
                  email: "remote@example.com"
                }
              }
            : fallback
        ),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }
    }));

    let isolated: typeof import("@/services/firestoreService");
    jest.isolateModules(() => {
      isolated = require("@/services/firestoreService");
    });

    const callback = jest.fn();
    const unsubscribe = isolated!.firestoreService.subscribeToTransactions("remote-user", callback);
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const id = await isolated!.firestoreService.createTransaction({
      userId: "remote-user",
      type: "expense",
      amount: 77,
      categoryId: "housing",
      categoryName: "Moradia",
      description: "Internet remota",
      date: "2026-03-10",
      isRecurring: false
    });

    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(id).toMatch(/^tx-/);
    expect(callback.mock.calls.at(-1)?.[0]).toEqual([
      expect.objectContaining({
        id,
        description: "Internet remota"
      })
    ]);

    unsubscribe();
  });

  it("falls back to local subscriptions when firestore is not configured", async () => {
    const callback = jest.fn();
    const { firestoreService: localFirestoreService } = loadLocalFirestoreService();
    const unsubscribe = localFirestoreService.subscribeToTransactions("local-demo-user", callback);
    await Promise.resolve();
    await Promise.resolve();

    expect(callback).toHaveBeenCalled();
    expect(callback.mock.calls.at(-1)?.[0]).toEqual([]);
    unsubscribe();
  });

  it("removes previously seeded demo transactions from cached local state", async () => {
    const callback = jest.fn();
    const initialState: FinanceHydrationPayload = {
      transactions: [
        {
          id: "demo-expense-1",
          userId: "local-demo-user",
          type: "expense",
          amount: 120,
          categoryId: "local-demo-user-Moradia",
          categoryName: "Moradia",
          description: "Internet Fibra",
          date: "2026-03-10",
          isRecurring: false,
          isPaid: false,
          createdAt: "2026-03-10T00:00:00.000Z",
          updatedAt: "2026-03-10T00:00:00.000Z"
        },
        {
          id: "tx-user-1",
          userId: "local-demo-user",
          type: "expense",
          amount: 80,
          categoryId: "local-demo-user-Saúde",
          categoryName: "Saúde",
          description: "Remédio",
          date: "2026-03-11",
          isRecurring: false,
          isPaid: false,
          createdAt: "2026-03-11T00:00:00.000Z",
          updatedAt: "2026-03-11T00:00:00.000Z"
        }
      ],
      categories: [],
      goals: [],
      settings: {
        theme: "dark",
        currency: "BRL"
      }
    };

    const { cache, firestoreService: localFirestoreService } = loadLocalFirestoreService(initialState);
    localFirestoreService.subscribeToTransactions("local-demo-user", callback);
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callback.mock.calls.at(-1)?.[0]).toEqual([
      expect.objectContaining({
        id: "tx-user-1"
      })
    ]);
    expect((cache.get("green-finance-local-finance") as FinanceHydrationPayload).transactions).toEqual([
      expect.objectContaining({
        id: "tx-user-1"
      })
    ]);
  });

  it("creates, updates and deletes transactions in local mode when firestore is not configured", async () => {
    const callback = jest.fn();
    const { firestoreService: localFirestoreService } = loadLocalFirestoreService();
    localFirestoreService.subscribeToTransactions("local-demo-user", callback);
    await Promise.resolve();
    await Promise.resolve();

    const id = await localFirestoreService.createTransaction({
      userId: "local-demo-user",
      type: "expense",
      amount: 77,
      categoryId: "cat-custom",
      categoryName: "Custom",
      description: "Teste local",
      date: "2026-03-10",
      isRecurring: false
    });

    await localFirestoreService.updateTransaction(id, {
      description: "Teste local editado"
    });
    await localFirestoreService.deleteTransaction(id);

    expect(callback.mock.calls.some(([transactions]) => transactions.some((transaction: { id: string }) => transaction.id === id))).toBe(true);
    expect(callback.mock.calls.at(-1)?.[0].some((transaction: { id: string }) => transaction.id === id)).toBe(false);
  });

  it("hydrates local categories, goals and settings from stored state when firestore is not configured", async () => {
    const localState: FinanceHydrationPayload = {
      transactions: [],
      categories: [
        {
          id: "b",
          userId: "local-demo-user",
          name: "Transporte",
          color: "#2563EB",
          icon: "car-outline",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z"
        },
        {
          id: "a",
          userId: "local-demo-user",
          name: "Alimentação",
          color: "#16A34A",
          icon: "restaurant-outline",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z"
        }
      ],
      goals: [
        {
          id: "goal-2",
          userId: "local-demo-user",
          name: "Viagem",
          targetAmount: 5000,
          currentAmount: 1800,
          deadline: "2026-10-01",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z"
        },
        {
          id: "goal-1",
          userId: "local-demo-user",
          name: "Reserva",
          targetAmount: 8000,
          currentAmount: 3200,
          deadline: "2026-05-01",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z"
        }
      ],
      settings: {
        theme: "light",
        currency: "BRL",
        email: "local@example.com"
      }
    };

    const { firestoreService: localFirestoreService } = loadLocalFirestoreService(localState);
    const categoriesCallback = jest.fn();
    const goalsCallback = jest.fn();
    const settingsCallback = jest.fn();

    localFirestoreService.subscribeToCategories("local-demo-user", categoriesCallback);
    localFirestoreService.subscribeToGoals("local-demo-user", goalsCallback);
    localFirestoreService.subscribeToSettings("local-demo-user", settingsCallback);
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(categoriesCallback.mock.calls.at(-1)?.[0].map((category: { name: string }) => category.name)).toEqual(["Alimentação", "Transporte"]);
    expect(goalsCallback.mock.calls.at(-1)?.[0].map((goal: { id: string }) => goal.id)).toEqual(["goal-1", "goal-2"]);
    expect(settingsCallback.mock.calls.at(-1)?.[0]).toEqual(localState.settings);
  });

  it("creates local recurring transactions and generated recurring transactions", async () => {
    const callback = jest.fn();
    const { firestoreService: localFirestoreService } = loadLocalFirestoreService();

    localFirestoreService.subscribeToTransactions("local-demo-user", callback);
    await Promise.resolve();
    await Promise.resolve();

    const rootId = await localFirestoreService.createTransaction({
      userId: "local-demo-user",
      type: "expense",
      amount: 120,
      categoryId: "local-demo-user-Moradia",
      categoryName: "Moradia",
      description: "Internet local",
      date: "2026-03-10",
      isRecurring: true,
      recurringFrequency: "monthly",
      recurringStartDate: "2026-03-10",
      recurringEndDate: "2026-04-10"
    });

    const generatedId = await localFirestoreService.createGeneratedRecurringTransaction({
      userId: "local-demo-user",
      type: "expense",
      amount: 39,
      categoryId: "local-demo-user-Lazer",
      categoryName: "Lazer",
      description: "Streaming local",
      date: "2026-03-15",
      isRecurring: true,
      recurringFrequency: "monthly",
      recurringStartDate: "2026-03-15",
      parentRecurringId: rootId
    });

    const latestTransactions = callback.mock.calls.at(-1)?.[0];
    expect(latestTransactions.some((transaction: { id: string }) => transaction.id === generatedId)).toBe(true);
    expect(latestTransactions.some((transaction: { parentRecurringId?: string }) => transaction.parentRecurringId === rootId)).toBe(true);
  });

  it("reuses the same generated recurring id in local mode instead of duplicating the month", async () => {
    const callback = jest.fn();
    const { firestoreService: localFirestoreService } = loadLocalFirestoreService();

    localFirestoreService.subscribeToTransactions("local-demo-user", callback);
    await Promise.resolve();
    await Promise.resolve();

    await localFirestoreService.createGeneratedRecurringTransaction({
      userId: "local-demo-user",
      type: "expense",
      amount: 700,
      categoryId: "local-demo-user-Moradia",
      categoryName: "Moradia",
      description: "Aluguel local",
      date: "2026-04-10",
      isRecurring: true,
      recurringFrequency: "monthly",
      recurringStartDate: "2026-03-10",
      parentRecurringId: "root-dup"
    });

    await localFirestoreService.createGeneratedRecurringTransaction({
      userId: "local-demo-user",
      type: "expense",
      amount: 700,
      categoryId: "local-demo-user-Moradia",
      categoryName: "Moradia",
      description: "Aluguel local",
      date: "2026-04-10",
      isRecurring: true,
      recurringFrequency: "monthly",
      recurringStartDate: "2026-03-10",
      parentRecurringId: "root-dup"
    });

    const latestTransactions = callback.mock.calls.at(-1)?.[0];
    expect(latestTransactions.filter((transaction: { parentRecurringId?: string; date: string }) => transaction.parentRecurringId === "root-dup" && transaction.date === "2026-04-10")).toHaveLength(1);
  });

  it("creates generated recurring transactions in a single local batch when firestore is not configured", async () => {
    const callback = jest.fn();
    const { firestoreService: localFirestoreService } = loadLocalFirestoreService();

    localFirestoreService.subscribeToTransactions("local-demo-user", callback);
    await Promise.resolve();
    await Promise.resolve();

    const generatedIds = await localFirestoreService.createGeneratedRecurringTransactions([
      {
        userId: "local-demo-user",
        type: "expense",
        amount: 120,
        categoryId: "local-demo-user-Moradia",
        categoryName: "Moradia",
        description: "Internet local",
        date: "2026-04-10",
        isRecurring: true,
        recurringFrequency: "monthly",
        recurringStartDate: "2026-03-10",
        parentRecurringId: "root-batch"
      },
      {
        userId: "local-demo-user",
        type: "expense",
        amount: 120,
        categoryId: "local-demo-user-Moradia",
        categoryName: "Moradia",
        description: "Internet local",
        date: "2026-05-10",
        isRecurring: true,
        recurringFrequency: "monthly",
        recurringStartDate: "2026-03-10",
        parentRecurringId: "root-batch"
      }
    ]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const latestTransactions = callback.mock.calls.at(-1)?.[0];
    expect(generatedIds).toEqual(["root-batch-2026-04-10", "root-batch-2026-05-10"]);
    expect(latestTransactions.filter((transaction: { parentRecurringId?: string }) => transaction.parentRecurringId === "root-batch")).toHaveLength(2);
  });

  it("updates local settings and goals when firestore is not configured", async () => {
    const goalsCallback = jest.fn();
    const settingsCallback = jest.fn();
    const { firestoreService: localFirestoreService } = loadLocalFirestoreService();

    localFirestoreService.subscribeToGoals("local-demo-user", goalsCallback);
    localFirestoreService.subscribeToSettings("local-demo-user", settingsCallback);
    await Promise.resolve();
    await Promise.resolve();

    await localFirestoreService.saveUserSettings("local-demo-user", {
      theme: "light",
      currency: "USD",
      email: "demo+local@example.com"
    });

    const goalId = await localFirestoreService.createGoal({
      userId: "local-demo-user",
      name: "Carro",
      targetAmount: 20000,
      currentAmount: 4000,
      deadline: "2026-11-30"
    });
    await localFirestoreService.updateGoal(goalId, {
      currentAmount: 6500
    });

    expect(settingsCallback.mock.calls.at(-1)?.[0]).toEqual({
      theme: "light",
      currency: "USD",
      displayName: "Modo demo",
      email: "demo+local@example.com"
    });
    expect(goalsCallback.mock.calls.at(-1)?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: goalId,
          currentAmount: 6500
        })
      ])
    );
  });

  it("ensures default categories for a new local user without duplicating them", async () => {
    const callback = jest.fn();
    const { firestoreService: localFirestoreService } = loadLocalFirestoreService();

    localFirestoreService.subscribeToCategories("local-second-user", callback);
    await Promise.resolve();
    await Promise.resolve();

    await localFirestoreService.ensureDefaultCategories("local-second-user");
    await localFirestoreService.ensureDefaultCategories("local-second-user");

    const latestCategories = callback.mock.calls.at(-1)?.[0];
    expect(latestCategories).toHaveLength(8);
    expect(new Set(latestCategories.map((category: { id: string }) => category.id)).size).toBe(8);
  });

  it("returns null settings for an unknown local user", async () => {
    const callback = jest.fn();
    const { firestoreService: localFirestoreService } = loadLocalFirestoreService();

    localFirestoreService.subscribeToSettings("unknown-local-user", callback);
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callback.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it("reuses the loaded local state for subsequent subscriptions", async () => {
    const { firestoreService: localFirestoreService } = loadLocalFirestoreService();
    const firstTransactions = jest.fn();
    const firstCategories = jest.fn();
    const firstGoals = jest.fn();
    const firstSettings = jest.fn();

    const unsubscribeTransactions = localFirestoreService.subscribeToTransactions("local-demo-user", firstTransactions);
    const unsubscribeCategories = localFirestoreService.subscribeToCategories("local-demo-user", firstCategories);
    const unsubscribeGoals = localFirestoreService.subscribeToGoals("local-demo-user", firstGoals);
    const unsubscribeSettings = localFirestoreService.subscribeToSettings("local-demo-user", firstSettings);
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const secondTransactions = jest.fn();
    const secondCategories = jest.fn();
    const secondGoals = jest.fn();
    const secondSettings = jest.fn();

    localFirestoreService.subscribeToTransactions("local-demo-user", secondTransactions);
    localFirestoreService.subscribeToCategories("local-demo-user", secondCategories);
    localFirestoreService.subscribeToGoals("local-demo-user", secondGoals);
    localFirestoreService.subscribeToSettings("local-demo-user", secondSettings);

    expect(secondTransactions).toHaveBeenCalled();
    expect(secondCategories).toHaveBeenCalled();
    expect(secondGoals).toHaveBeenCalled();
    expect(secondSettings).toHaveBeenCalled();

    unsubscribeTransactions();
    unsubscribeCategories();
    unsubscribeGoals();
    unsubscribeSettings();
  });
});
