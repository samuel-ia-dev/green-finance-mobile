import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { cacheService } from "@/services/cacheService";
import { db } from "@/services/firebase";
import { isRemoteBackendConfigured, isRemoteNetworkError, remoteBackendService } from "@/services/remoteBackendService";
import { Category, FinanceHydrationPayload, Goal, Transaction, TransactionInput, UserSettings } from "@/types/finance";
import { buildRecurringInstallments, resolveRecurringEndDate } from "@/utils/recurring";

const FINANCE_CACHE_KEY = "finance-cache";
const LOCAL_FINANCE_KEY = "green-finance-local-finance";
const LOCAL_DEMO_USER_ID = "local-demo-user";
const REMOTE_POLL_INTERVAL_MS = 2000;
const REMOTE_STATE_CACHE_KEY_PREFIX = "green-finance.remote-state";
const REMOTE_MUTATION_QUEUE_KEY = "green-finance.remote-mutation-queue";

type LocalTransactionsSubscriber = {
  userId: string;
  callback: (transactions: Transaction[]) => void;
};

type LocalCategoriesSubscriber = {
  userId: string;
  callback: (categories: Category[]) => void;
};

type LocalGoalsSubscriber = {
  userId: string;
  callback: (goals: Goal[]) => void;
};

type LocalSettingsSubscriber = {
  userId: string;
  callback: (settings: UserSettings | null) => void;
};

const localTransactionsSubscribers = new Set<LocalTransactionsSubscriber>();
const localCategoriesSubscribers = new Set<LocalCategoriesSubscriber>();
const localGoalsSubscribers = new Set<LocalGoalsSubscriber>();
const localSettingsSubscribers = new Set<LocalSettingsSubscriber>();

const remoteTransactionsSubscribers = new Set<LocalTransactionsSubscriber>();
const remoteCategoriesSubscribers = new Set<LocalCategoriesSubscriber>();
const remoteGoalsSubscribers = new Set<LocalGoalsSubscriber>();
const remoteSettingsSubscribers = new Set<LocalSettingsSubscriber>();

let localStateCache: FinanceHydrationPayload | null = null;
let localStatePromise: Promise<FinanceHydrationPayload> | null = null;
const remoteStateCache = new Map<string, FinanceHydrationPayload>();
const remotePollingHandles = new Map<string, ReturnType<typeof setInterval>>();
const remoteRefreshPromises = new Map<string, Promise<FinanceHydrationPayload>>();
let remoteMutationQueueCache: RemoteMutation[] | null = null;
let remoteMutationQueuePromise: Promise<RemoteMutation[]> | null = null;
const remoteFlushPromises = new Map<string, Promise<void>>();

type RemoteBulkUpsertCollection = "categories" | "goals" | "transactions";

type RemoteBulkUpsertMutation = {
  kind: "bulk-upsert";
  userId: string;
  collection: RemoteBulkUpsertCollection;
  items: (Category | Goal | Transaction)[];
};

type RemotePatchTransactionMutation = {
  kind: "patch-transaction";
  userId: string;
  id: string;
  input: Partial<Transaction>;
};

type RemoteDeleteTransactionMutation = {
  kind: "delete-transaction";
  userId: string;
  id: string;
};

type RemoteSaveSettingsMutation = {
  kind: "save-settings";
  userId: string;
  settings: UserSettings;
};

type RemotePatchGoalMutation = {
  kind: "patch-goal";
  userId: string;
  id: string;
  input: Partial<Goal>;
};

type RemoteMutation =
  | RemoteBulkUpsertMutation
  | RemotePatchTransactionMutation
  | RemoteDeleteTransactionMutation
  | RemoteSaveSettingsMutation
  | RemotePatchGoalMutation;

const transactionsCollection = () => collection(db!, "transactions");
const categoriesCollection = () => collection(db!, "categories");
const goalsCollection = () => collection(db!, "goals");
const FIRESTORE_WRITE_BATCH_LIMIT = 450;

function normalizeSnapshot<T extends Record<string, unknown>>(snapshot: { docs: { id?: string; data?: () => unknown }[] }) {
  return snapshot.docs.map((entry, index) => {
    /* istanbul ignore next -- snapshots sem data são apenas fallback defensivo */
    const data = (entry.data ? entry.data() : {}) as Record<string, unknown>;
    return {
      id: entry.id ?? `mock-${index}`,
      ...data
    };
  }) as unknown as T[];
}

function buildLocalTimestamp() {
  return new Date().toISOString();
}

function buildLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildGeneratedRecurringId(input: Pick<TransactionInput, "date" | "parentRecurringId"> & { id?: string }) {
  return input.id ?? `${input.parentRecurringId ?? "recurring"}-${input.date}`;
}

function buildRemoteStateKey(userId: string) {
  return `${REMOTE_STATE_CACHE_KEY_PREFIX}.${userId}`;
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export const defaultCategories = [
  { name: "Alimentação", color: "#B7F53B", icon: "restaurant-outline" },
  { name: "Transporte", color: "#31E1F7", icon: "car-outline" },
  { name: "Moradia", color: "#22C55E", icon: "home-outline" },
  { name: "Saúde", color: "#EF4444", icon: "medkit-outline" },
  { name: "Educação", color: "#34D399", icon: "school-outline" },
  { name: "Lazer", color: "#87E64B", icon: "game-controller-outline" },
  { name: "Investimentos", color: "#2DD4BF", icon: "trending-up-outline" },
  { name: "Outros", color: "#64748B", icon: "apps-outline" }
];

function buildLocalCategories(userId: string) {
  const now = buildLocalTimestamp();

  return defaultCategories.map((category) => ({
    id: `${userId}-${category.name}`,
    userId,
    ...category,
    createdAt: now,
    updatedAt: now
  }));
}

function buildDemoState(): FinanceHydrationPayload {
  const now = buildLocalTimestamp();
  const categories = buildLocalCategories(LOCAL_DEMO_USER_ID);

  return {
    transactions: [],
    categories,
    goals: [
      {
        id: "demo-goal-1",
        userId: LOCAL_DEMO_USER_ID,
        name: "Reserva de emergência",
        targetAmount: 12000,
        currentAmount: 4800,
        deadline: `${new Date().getFullYear()}-12-31`,
        createdAt: now,
        updatedAt: now
      }
    ],
    settings: {
      theme: "dark",
      currency: "BRL",
      displayName: "Modo demo",
      email: "demo@greenfinance.local"
    }
  };
}

function buildEmptyRemoteState(): FinanceHydrationPayload {
  return {
    transactions: [],
    categories: [],
    goals: [],
    settings: {
      theme: "system",
      currency: "BRL"
    }
  };
}

function normalizeRemoteState(state: FinanceHydrationPayload | null | undefined): FinanceHydrationPayload {
  const baseState = buildEmptyRemoteState();

  return {
    transactions: state?.transactions ?? baseState.transactions,
    categories: state?.categories ?? baseState.categories,
    goals: state?.goals ?? baseState.goals,
    settings: {
      ...baseState.settings,
      ...(state?.settings ?? {})
    }
  };
}

function sanitizeLocalState(state: FinanceHydrationPayload) {
  const transactions = state.transactions.filter((transaction) => !transaction.id.startsWith("demo-"));

  return {
    state: {
      ...state,
      transactions
    },
    changed: transactions.length !== state.transactions.length
  };
}

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort((left, right) => right.date.localeCompare(left.date));
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((left, right) => left.name.localeCompare(right.name));
}

function sortGoals(goals: Goal[]) {
  return [...goals].sort((left, right) => left.deadline.localeCompare(right.deadline));
}

async function getLocalState() {
  if (localStateCache) {
    return localStateCache;
  }

  if (localStatePromise) {
    return localStatePromise;
  }

  localStatePromise = cacheService
    .getItem<FinanceHydrationPayload | null>(LOCAL_FINANCE_KEY, null)
    .then(async (stored) => {
      const baseState = stored ?? buildDemoState();
      const { changed, state } = sanitizeLocalState(baseState);
      localStateCache = state;

      if (!stored || changed) {
        await cacheService.setItem(LOCAL_FINANCE_KEY, localStateCache);
      }

      return localStateCache;
    })
    .finally(() => {
      localStatePromise = null;
    });

  return localStatePromise;
}

function emitLocalState(state: FinanceHydrationPayload) {
  localTransactionsSubscribers.forEach((subscriber) => {
    subscriber.callback(sortTransactions(state.transactions.filter((transaction) => transaction.userId === subscriber.userId)));
  });

  localCategoriesSubscribers.forEach((subscriber) => {
    subscriber.callback(sortCategories(state.categories.filter((category) => category.userId === subscriber.userId)));
  });

  localGoalsSubscribers.forEach((subscriber) => {
    subscriber.callback(sortGoals(state.goals.filter((goal) => goal.userId === subscriber.userId)));
  });

  localSettingsSubscribers.forEach((subscriber) => {
    const hasUserData =
      state.transactions.some((transaction) => transaction.userId === subscriber.userId) ||
      state.categories.some((category) => category.userId === subscriber.userId) ||
      state.goals.some((goal) => goal.userId === subscriber.userId) ||
      subscriber.userId === LOCAL_DEMO_USER_ID;

    subscriber.callback(hasUserData ? state.settings : null);
  });
}

function emitRemoteState(userId: string, state: FinanceHydrationPayload) {
  remoteStateCache.set(userId, state);

  remoteTransactionsSubscribers.forEach((subscriber) => {
    if (subscriber.userId === userId) {
      subscriber.callback(sortTransactions(state.transactions));
    }
  });

  remoteCategoriesSubscribers.forEach((subscriber) => {
    if (subscriber.userId === userId) {
      subscriber.callback(sortCategories(state.categories));
    }
  });

  remoteGoalsSubscribers.forEach((subscriber) => {
    if (subscriber.userId === userId) {
      subscriber.callback(sortGoals(state.goals));
    }
  });

  remoteSettingsSubscribers.forEach((subscriber) => {
    if (subscriber.userId === userId) {
      subscriber.callback(state.settings);
    }
  });
}

async function getRemoteMutationQueue() {
  if (remoteMutationQueueCache) {
    return remoteMutationQueueCache;
  }

  if (remoteMutationQueuePromise) {
    return remoteMutationQueuePromise;
  }

  remoteMutationQueuePromise = cacheService
    .getItem<RemoteMutation[] | null>(REMOTE_MUTATION_QUEUE_KEY, null)
    .then((stored) => {
      remoteMutationQueueCache = stored ?? [];
      return remoteMutationQueueCache;
    })
    .finally(() => {
      remoteMutationQueuePromise = null;
    });

  return remoteMutationQueuePromise;
}

async function persistRemoteMutationQueue(queue: RemoteMutation[]) {
  remoteMutationQueueCache = queue;
  await cacheService.setItem(REMOTE_MUTATION_QUEUE_KEY, queue);
}

async function enqueueRemoteMutation(mutation: RemoteMutation) {
  const queue = await getRemoteMutationQueue();
  await persistRemoteMutationQueue([...queue, mutation]);
}

async function readPersistedRemoteState(userId: string) {
  const storedState = await cacheService.getItem<FinanceHydrationPayload | null>(buildRemoteStateKey(userId), null);

  if (storedState) {
    return normalizeRemoteState(storedState);
  }

  const cachedFinance = await cacheService.getItem<FinanceHydrationPayload | null>(FINANCE_CACHE_KEY, null);
  return normalizeRemoteState(cachedFinance);
}

async function getRemoteState(userId: string) {
  const cachedState = remoteStateCache.get(userId);

  if (cachedState) {
    return cachedState;
  }

  const storedState = await readPersistedRemoteState(userId);
  remoteStateCache.set(userId, storedState);
  return storedState;
}

async function persistRemoteState(userId: string, state: FinanceHydrationPayload) {
  const normalizedState = normalizeRemoteState(state);
  emitRemoteState(userId, normalizedState);
  await cacheService.setItem(buildRemoteStateKey(userId), normalizedState);
  return normalizedState;
}

function upsertItemsById<T extends { id: string }>(currentItems: T[], nextItems: T[]) {
  const itemsById = new Map(currentItems.map((item) => [item.id, item]));

  nextItems.forEach((item) => {
    const currentItem = itemsById.get(item.id);
    itemsById.set(item.id, currentItem ? { ...currentItem, ...item } : item);
  });

  return Array.from(itemsById.values());
}

async function updateRemoteStateLocally(userId: string, updater: (state: FinanceHydrationPayload) => FinanceHydrationPayload) {
  const currentState = await getRemoteState(userId);
  return persistRemoteState(userId, updater(currentState));
}

async function primeRemoteStateFromCache(userId: string) {
  const state = await getRemoteState(userId);
  emitRemoteState(userId, state);
  await cacheService.setItem(buildRemoteStateKey(userId), state);
  return state;
}

function getRemoteSubscriberCount(userId: string) {
  return (
    Array.from(remoteTransactionsSubscribers).filter((subscriber) => subscriber.userId === userId).length +
    Array.from(remoteCategoriesSubscribers).filter((subscriber) => subscriber.userId === userId).length +
    Array.from(remoteGoalsSubscribers).filter((subscriber) => subscriber.userId === userId).length +
    Array.from(remoteSettingsSubscribers).filter((subscriber) => subscriber.userId === userId).length
  );
}

async function refreshRemoteState(userId: string) {
  const currentRefresh = remoteRefreshPromises.get(userId);

  if (currentRefresh) {
    return currentRefresh;
  }

  const refreshPromise = remoteBackendService.getFinanceBootstrap().then(async (state) => {
    await persistRemoteState(userId, state);
    return state;
  });

  remoteRefreshPromises.set(userId, refreshPromise);

  return refreshPromise.finally(() => {
    remoteRefreshPromises.delete(userId);
  });
}

async function syncRemoteState(userId: string) {
  await flushPendingRemoteMutations(userId);
  return refreshRemoteState(userId);
}

function ensureRemotePolling(userId: string) {
  if (remotePollingHandles.has(userId)) {
    return;
  }

  void syncRemoteState(userId).catch(() => undefined);
  const handle = setInterval(() => {
    void syncRemoteState(userId).catch(() => undefined);
  }, REMOTE_POLL_INTERVAL_MS);
  remotePollingHandles.set(userId, handle);
}

function stopRemotePollingIfUnused(userId: string) {
  if (getRemoteSubscriberCount(userId) > 0) {
    return;
  }

  const handle = remotePollingHandles.get(userId);

  if (handle) {
    clearInterval(handle);
    remotePollingHandles.delete(userId);
  }
}

function emitLatestLocalState() {
  if (localStateCache) {
    emitLocalState(localStateCache);
  }
}

function findRemoteTransactionUserId(id: string) {
  for (const [userId, state] of remoteStateCache.entries()) {
    if (state.transactions.some((transaction) => transaction.id === id)) {
      return userId;
    }
  }

  return null;
}

function findRemoteGoalUserId(id: string) {
  for (const [userId, state] of remoteStateCache.entries()) {
    if (state.goals.some((goal) => goal.id === id)) {
      return userId;
    }
  }

  return null;
}

async function applyRemoteBulkUpsert(
  userId: string,
  collection: RemoteBulkUpsertCollection,
  items: (Category | Goal | Transaction)[]
) {
  if (!items.length) {
    return;
  }

  await updateRemoteStateLocally(userId, (state) => {
    if (collection === "transactions") {
      return {
        ...state,
        transactions: upsertItemsById(state.transactions, items as Transaction[])
      };
    }

    if (collection === "categories") {
      return {
        ...state,
        categories: upsertItemsById(state.categories, items as Category[])
      };
    }

    return {
      ...state,
      goals: upsertItemsById(state.goals, items as Goal[])
    };
  });
}

async function applyRemoteTransactionPatch(userId: string, id: string, input: Partial<Transaction>) {
  await updateRemoteStateLocally(userId, (state) => ({
    ...state,
    transactions: state.transactions.map((transaction) =>
      transaction.id === id
        ? {
            ...transaction,
            ...input
          }
        : transaction
    )
  }));
}

async function applyRemoteTransactionDelete(userId: string, id: string) {
  await updateRemoteStateLocally(userId, (state) => ({
    ...state,
    transactions: state.transactions.filter((transaction) => transaction.id !== id)
  }));
}

async function applyRemoteSettings(userId: string, settings: UserSettings) {
  await updateRemoteStateLocally(userId, (state) => ({
    ...state,
    settings: {
      ...state.settings,
      ...settings
    }
  }));
}

async function applyRemoteGoalPatch(userId: string, id: string, input: Partial<Goal>) {
  await updateRemoteStateLocally(userId, (state) => ({
    ...state,
    goals: state.goals.map((goal) =>
      goal.id === id
        ? {
            ...goal,
            ...input
          }
        : goal
    )
  }));
}

async function executeRemoteMutation(mutation: RemoteMutation) {
  switch (mutation.kind) {
    case "bulk-upsert":
      await remoteBackendService.bulkUpsert(mutation.collection, mutation.items);
      return;
    case "patch-transaction":
      await remoteBackendService.patchTransaction(mutation.id, mutation.input);
      return;
    case "delete-transaction":
      await remoteBackendService.deleteTransaction(mutation.id);
      return;
    case "save-settings":
      await remoteBackendService.saveSettings(mutation.settings);
      return;
    case "patch-goal":
      await remoteBackendService.patchGoal(mutation.id, mutation.input);
      return;
  }
}

async function flushPendingRemoteMutations(userId: string) {
  const currentFlush = remoteFlushPromises.get(userId);

  if (currentFlush) {
    return currentFlush;
  }

  const flushPromise = (async () => {
    const queuedMutations = await getRemoteMutationQueue();
    const nextQueue = [...queuedMutations];
    let queueChanged = false;

    for (let index = 0; index < nextQueue.length; index += 1) {
      const mutation = nextQueue[index];

      if (mutation.userId !== userId) {
        continue;
      }

      try {
        await executeRemoteMutation(mutation);
        nextQueue.splice(index, 1);
        index -= 1;
        queueChanged = true;
      } catch (error) {
        if (queueChanged) {
          await persistRemoteMutationQueue(nextQueue);
        }

        throw error;
      }
    }

    if (queueChanged) {
      await persistRemoteMutationQueue(nextQueue);
    }
  })().finally(() => {
    remoteFlushPromises.delete(userId);
  });

  remoteFlushPromises.set(userId, flushPromise);
  return flushPromise;
}

async function persistLocalState(state: FinanceHydrationPayload) {
  localStateCache = state;
  await cacheService.setItem(LOCAL_FINANCE_KEY, state);
  emitLocalState(state);
}

async function updateLocalState<T>(updater: (state: FinanceHydrationPayload) => { state: FinanceHydrationPayload; result: T }) {
  const currentState = await getLocalState();
  const { state, result } = updater(currentState);
  await persistLocalState(state);
  return result;
}

async function createGeneratedRecurringTransactions(input: TransactionInput[]) {
  if (!input.length) {
    return [];
  }

  if (!db && isRemoteBackendConfigured()) {
    const now = buildLocalTimestamp();
    const transactions = input.map((transactionInput) => ({
      ...transactionInput,
      id: buildGeneratedRecurringId(transactionInput),
      createdAt: now,
      updatedAt: now
    }));

    try {
      await remoteBackendService.bulkUpsert("transactions", transactions);
      await syncRemoteState(input[0].userId).catch(() => undefined);
    } catch (error) {
      if (!isRemoteNetworkError(error)) {
        throw error;
      }

      await applyRemoteBulkUpsert(input[0].userId, "transactions", transactions);
      await enqueueRemoteMutation({
        kind: "bulk-upsert",
        userId: input[0].userId,
        collection: "transactions",
        items: transactions
      });
    }

    return transactions.map((transaction) => transaction.id);
  }

  if (!db) {
    return updateLocalState((state) => {
      const now = buildLocalTimestamp();
      const transactionsById = new Map(state.transactions.map((transaction) => [transaction.id, transaction]));
      const generatedIds = input.map((transactionInput) => {
        const generatedId = buildGeneratedRecurringId(transactionInput);
        const existingTransaction = transactionsById.get(generatedId);

        transactionsById.set(generatedId, {
          ...transactionInput,
          id: generatedId,
          createdAt: existingTransaction?.createdAt ?? now,
          updatedAt: now
        });

        return generatedId;
      });

      return {
        state: {
          ...state,
          transactions: Array.from(transactionsById.values())
        },
        result: generatedIds
      };
    });
  }

  const generatedIds: string[] = [];

  for (const chunk of chunkItems(input, FIRESTORE_WRITE_BATCH_LIMIT)) {
    const batch = writeBatch(db!);

    chunk.forEach((transactionInput) => {
      const generatedId = buildGeneratedRecurringId(transactionInput);
      generatedIds.push(generatedId);
      batch.set(doc(db!, "transactions", generatedId), {
        ...transactionInput,
        id: generatedId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
  }

  return generatedIds;
}

function ensureLocalCategoriesForUser(state: FinanceHydrationPayload, userId: string) {
  const existingIds = new Set(state.categories.filter((category) => category.userId === userId).map((category) => category.id));
  const missingCategories = buildLocalCategories(userId).filter((category) => !existingIds.has(category.id));

  if (!missingCategories.length) {
    return state.categories;
  }

  return [...state.categories, ...missingCategories];
}

export const firestoreService = {
  async createTransaction(input: TransactionInput) {
    const normalizedInput =
      input.isRecurring && input.recurringStartDate
        ? {
            ...input,
            recurringEndDate: resolveRecurringEndDate(input.recurringStartDate, input.recurringEndDate)
          }
        : input;

    if (!db && isRemoteBackendConfigured()) {
      const now = buildLocalTimestamp();
      const id = buildLocalId("tx");
      const transactions: Transaction[] = [
        {
          ...normalizedInput,
          id,
          createdAt: now,
          updatedAt: now
        }
      ];

      if (normalizedInput.isRecurring && normalizedInput.recurringFrequency && normalizedInput.recurringStartDate) {
        const generated = buildRecurringInstallments({
          amount: normalizedInput.amount,
          categoryId: normalizedInput.categoryId,
          categoryName: normalizedInput.categoryName,
          description: normalizedInput.description,
          config: {
            frequency: normalizedInput.recurringFrequency,
            startDate: normalizedInput.recurringStartDate,
            endDate: normalizedInput.recurringEndDate
          },
          existingDates: [normalizedInput.date],
          parentRecurringId: id,
          referenceDate: new Date(`${normalizedInput.recurringStartDate}T00:00:00`),
          userId: normalizedInput.userId
        }).map((transaction) => ({
          ...transaction,
          createdAt: now,
          updatedAt: now
        }));

        transactions.push(...generated);
      }

      try {
        await remoteBackendService.bulkUpsert("transactions", transactions);
        await syncRemoteState(normalizedInput.userId).catch(() => undefined);
      } catch (error) {
        if (!isRemoteNetworkError(error)) {
          throw error;
        }

        await applyRemoteBulkUpsert(normalizedInput.userId, "transactions", transactions);
        await enqueueRemoteMutation({
          kind: "bulk-upsert",
          userId: normalizedInput.userId,
          collection: "transactions",
          items: transactions
        });
      }

      return id;
    }

    if (!db) {
      return updateLocalState((state) => {
        const now = buildLocalTimestamp();
        const id = buildLocalId("tx");
        const transactions: Transaction[] = [
          ...state.transactions,
          {
            ...normalizedInput,
            id,
            createdAt: now,
            updatedAt: now
          }
        ];

        if (normalizedInput.isRecurring && normalizedInput.recurringFrequency && normalizedInput.recurringStartDate) {
          const generated = buildRecurringInstallments({
            amount: normalizedInput.amount,
            categoryId: normalizedInput.categoryId,
            categoryName: normalizedInput.categoryName,
            description: normalizedInput.description,
            config: {
              frequency: normalizedInput.recurringFrequency,
              startDate: normalizedInput.recurringStartDate,
              endDate: normalizedInput.recurringEndDate
            },
            existingDates: [normalizedInput.date],
            parentRecurringId: id,
            referenceDate: new Date(`${normalizedInput.recurringStartDate}T00:00:00`),
            userId: normalizedInput.userId
          }).map((transaction) => ({
            ...transaction,
            createdAt: now,
            updatedAt: now
          }));

          transactions.push(...generated);
        }

        return {
          state: {
            ...state,
            transactions
          },
          result: id
        };
      });
    }

    const payload = {
      ...normalizedInput,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const transactionRef = await addDoc(transactionsCollection(), payload);

    if (normalizedInput.isRecurring && normalizedInput.recurringFrequency && normalizedInput.recurringStartDate) {
      const generated = buildRecurringInstallments({
        amount: normalizedInput.amount,
        categoryId: normalizedInput.categoryId,
        categoryName: normalizedInput.categoryName,
        description: normalizedInput.description,
        config: {
          frequency: normalizedInput.recurringFrequency,
          startDate: normalizedInput.recurringStartDate,
          endDate: normalizedInput.recurringEndDate
        },
        existingDates: [normalizedInput.date],
        parentRecurringId: transactionRef.id,
        referenceDate: new Date(`${normalizedInput.recurringStartDate}T00:00:00`),
        userId: normalizedInput.userId
      });

      await createGeneratedRecurringTransactions(generated);
    }

    return transactionRef.id;
  },

  async createGeneratedRecurringTransactions(input: TransactionInput[]) {
    return createGeneratedRecurringTransactions(input);
  },

  async createGeneratedRecurringTransaction(input: TransactionInput) {
    const [generatedId] = await createGeneratedRecurringTransactions([input]);
    return generatedId;
  },

  async primeRemoteStateFromCache(userId: string) {
    if (db || !isRemoteBackendConfigured()) {
      return null;
    }

    return primeRemoteStateFromCache(userId);
  },

  async flushPendingRemoteMutations(userId: string) {
    if (db || !isRemoteBackendConfigured()) {
      return;
    }

    await flushPendingRemoteMutations(userId);
  },

  async updateTransaction(id: string, input: Partial<TransactionInput>) {
    if (!db && isRemoteBackendConfigured()) {
      const userId = input.userId ?? findRemoteTransactionUserId(id);
      const nextInput = {
        ...input,
        updatedAt: buildLocalTimestamp()
      };

      try {
        await remoteBackendService.patchTransaction(id, nextInput);

        if (userId) {
          await syncRemoteState(userId).catch(() => undefined);
        }
      } catch (error) {
        if (!isRemoteNetworkError(error) || !userId) {
          throw error;
        }

        await applyRemoteTransactionPatch(userId, id, nextInput as Partial<Transaction>);
        await enqueueRemoteMutation({
          kind: "patch-transaction",
          userId,
          id,
          input: nextInput as Partial<Transaction>
        });
      }

      return;
    }

    if (!db) {
      await updateLocalState((state) => ({
        state: {
          ...state,
          transactions: state.transactions.map((transaction) =>
            transaction.id === id
              ? {
                  ...transaction,
                  ...input,
                  updatedAt: buildLocalTimestamp()
                }
              : transaction
          )
        },
        result: undefined
      }));

      return;
    }

    await updateDoc(doc(db!, "transactions", id), {
      ...input,
      updatedAt: serverTimestamp()
    });
  },

  async deleteTransaction(id: string) {
    if (!db && isRemoteBackendConfigured()) {
      const userId = findRemoteTransactionUserId(id);
      try {
        await remoteBackendService.deleteTransaction(id);

        if (userId) {
          await syncRemoteState(userId).catch(() => undefined);
        }
      } catch (error) {
        if (!isRemoteNetworkError(error) || !userId) {
          throw error;
        }

        await applyRemoteTransactionDelete(userId, id);
        await enqueueRemoteMutation({
          kind: "delete-transaction",
          userId,
          id
        });
      }

      return;
    }

    if (!db) {
      await updateLocalState((state) => ({
        state: {
          ...state,
          transactions: state.transactions.filter((transaction) => transaction.id !== id)
        },
        result: undefined
      }));

      return;
    }

    await deleteDoc(doc(db!, "transactions", id));
  },

  subscribeToTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    if (!db && isRemoteBackendConfigured()) {
      const subscriber = { userId, callback };
      remoteTransactionsSubscribers.add(subscriber);
      const cachedState = remoteStateCache.get(userId);

      if (cachedState) {
        callback(sortTransactions(cachedState.transactions));
      } else {
        void primeRemoteStateFromCache(userId).catch(() => undefined);
      }

      ensureRemotePolling(userId);

      return () => {
        remoteTransactionsSubscribers.delete(subscriber);
        stopRemotePollingIfUnused(userId);
      };
    }

    if (!db) {
      const subscriber = { userId, callback };
      localTransactionsSubscribers.add(subscriber);
      if (!localStateCache) {
        emitLocalState(buildDemoState());
      } else {
        emitLocalState(localStateCache);
      }
      void getLocalState().then(() => emitLatestLocalState());

      return () => {
        localTransactionsSubscribers.delete(subscriber);
      };
    }

    return onSnapshot(
      query(transactionsCollection(), where("userId", "==", userId), orderBy("date", "desc")),
      (snapshot) => callback(normalizeSnapshot<Transaction>(snapshot as unknown as { docs: { id?: string; data?: () => unknown }[] }))
    );
  },

  subscribeToCategories(userId: string, callback: (categories: Category[]) => void) {
    if (!db && isRemoteBackendConfigured()) {
      const subscriber = { userId, callback };
      remoteCategoriesSubscribers.add(subscriber);
      const cachedState = remoteStateCache.get(userId);

      if (cachedState) {
        callback(sortCategories(cachedState.categories));
      } else {
        void primeRemoteStateFromCache(userId).catch(() => undefined);
      }

      ensureRemotePolling(userId);

      return () => {
        remoteCategoriesSubscribers.delete(subscriber);
        stopRemotePollingIfUnused(userId);
      };
    }

    if (!db) {
      const subscriber = { userId, callback };
      localCategoriesSubscribers.add(subscriber);
      if (!localStateCache) {
        emitLocalState(buildDemoState());
      } else {
        emitLocalState(localStateCache);
      }
      void getLocalState().then(() => emitLatestLocalState());

      return () => {
        localCategoriesSubscribers.delete(subscriber);
      };
    }

    return onSnapshot(
      query(categoriesCollection(), where("userId", "==", userId), orderBy("name")),
      (snapshot) => callback(normalizeSnapshot<Category>(snapshot as unknown as { docs: { id?: string; data?: () => unknown }[] }))
    );
  },

  subscribeToGoals(userId: string, callback: (goals: Goal[]) => void) {
    if (!db && isRemoteBackendConfigured()) {
      const subscriber = { userId, callback };
      remoteGoalsSubscribers.add(subscriber);
      const cachedState = remoteStateCache.get(userId);

      if (cachedState) {
        callback(sortGoals(cachedState.goals));
      } else {
        void primeRemoteStateFromCache(userId).catch(() => undefined);
      }

      ensureRemotePolling(userId);

      return () => {
        remoteGoalsSubscribers.delete(subscriber);
        stopRemotePollingIfUnused(userId);
      };
    }

    if (!db) {
      const subscriber = { userId, callback };
      localGoalsSubscribers.add(subscriber);
      if (!localStateCache) {
        emitLocalState(buildDemoState());
      } else {
        emitLocalState(localStateCache);
      }
      void getLocalState().then(() => emitLatestLocalState());

      return () => {
        localGoalsSubscribers.delete(subscriber);
      };
    }

    return onSnapshot(
      query(goalsCollection(), where("userId", "==", userId), orderBy("deadline")),
      (snapshot) => callback(normalizeSnapshot<Goal>(snapshot as unknown as { docs: { id?: string; data?: () => unknown }[] }))
    );
  },

  subscribeToSettings(userId: string, callback: (settings: UserSettings | null) => void) {
    if (!db && isRemoteBackendConfigured()) {
      const subscriber = { userId, callback };
      remoteSettingsSubscribers.add(subscriber);
      const cachedState = remoteStateCache.get(userId);

      if (cachedState) {
        callback(cachedState.settings);
      } else {
        void primeRemoteStateFromCache(userId).catch(() => undefined);
      }

      ensureRemotePolling(userId);

      return () => {
        remoteSettingsSubscribers.delete(subscriber);
        stopRemotePollingIfUnused(userId);
      };
    }

    if (!db) {
      const subscriber = { userId, callback };
      localSettingsSubscribers.add(subscriber);
      if (!localStateCache) {
        emitLocalState(buildDemoState());
      } else {
        emitLocalState(localStateCache);
      }
      void getLocalState().then(() => emitLatestLocalState());

      return () => {
        localSettingsSubscribers.delete(subscriber);
      };
    }

    return (onSnapshot as any)(doc(db!, "settings", userId), (snapshot: { data?: () => UserSettings }) => {
      callback(snapshot.data ? snapshot.data() : null);
    });
  },

  async saveUserSettings(userId: string, settings: UserSettings) {
    if (!db && isRemoteBackendConfigured()) {
      try {
        await remoteBackendService.saveSettings(settings);
        await syncRemoteState(userId).catch(() => undefined);
      } catch (error) {
        if (!isRemoteNetworkError(error)) {
          throw error;
        }

        await applyRemoteSettings(userId, settings);
        await enqueueRemoteMutation({
          kind: "save-settings",
          userId,
          settings
        });
      }

      return;
    }

    if (!db) {
      await updateLocalState((state) => ({
        state: {
          ...state,
          settings: {
            ...state.settings,
            ...settings
          }
        },
        result: undefined
      }));

      return;
    }

    await setDoc(
      doc(db!, "settings", userId),
      {
        userId,
        ...settings,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  },

  async ensureDefaultCategories(userId: string) {
    if (!db && isRemoteBackendConfigured()) {
      const now = buildLocalTimestamp();
      const categories = buildLocalCategories(userId).map((category) => ({
        ...category,
        createdAt: category.createdAt ?? now,
        updatedAt: now
      }));

      try {
        await remoteBackendService.bulkUpsert("categories", categories);
        await syncRemoteState(userId).catch(() => undefined);
      } catch (error) {
        if (!isRemoteNetworkError(error)) {
          throw error;
        }

        await applyRemoteBulkUpsert(userId, "categories", categories);
        await enqueueRemoteMutation({
          kind: "bulk-upsert",
          userId,
          collection: "categories",
          items: categories
        });
      }

      return;
    }

    if (!db) {
      await updateLocalState((state) => ({
        state: {
          ...state,
          categories: ensureLocalCategoriesForUser(state, userId)
        },
        result: undefined
      }));

      return;
    }

    await Promise.all(
      defaultCategories.map((category) =>
        setDoc(doc(db!, "categories", `${userId}-${category.name}`), {
          id: `${userId}-${category.name}`,
          userId,
          ...category,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      )
    );
  },

  async createGoal(goal: Omit<Goal, "id" | "createdAt" | "updatedAt">) {
    if (!db && isRemoteBackendConfigured()) {
      const now = buildLocalTimestamp();
      const id = buildLocalId("goal");
      const payload = {
        ...goal,
        id,
        createdAt: now,
        updatedAt: now
      };

      try {
        await remoteBackendService.bulkUpsert("goals", [payload]);
        await syncRemoteState(goal.userId).catch(() => undefined);
      } catch (error) {
        if (!isRemoteNetworkError(error)) {
          throw error;
        }

        await applyRemoteBulkUpsert(goal.userId, "goals", [payload]);
        await enqueueRemoteMutation({
          kind: "bulk-upsert",
          userId: goal.userId,
          collection: "goals",
          items: [payload]
        });
      }

      return id;
    }

    if (!db) {
      return updateLocalState((state) => {
        const now = buildLocalTimestamp();
        const id = buildLocalId("goal");

        return {
          state: {
            ...state,
            goals: [
              ...state.goals,
              {
                ...goal,
                id,
                createdAt: now,
                updatedAt: now
              }
            ]
          },
          result: id
        };
      });
    }

    const reference = await addDoc(goalsCollection(), {
      ...goal,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return reference.id;
  },

  async updateGoal(id: string, input: Partial<Omit<Goal, "id" | "userId" | "createdAt" | "updatedAt">>) {
    if (!db && isRemoteBackendConfigured()) {
      const userId = findRemoteGoalUserId(id);
      const nextInput = {
        ...input,
        updatedAt: buildLocalTimestamp()
      } as Partial<Goal>;

      try {
        await remoteBackendService.patchGoal(id, nextInput);

        if (userId) {
          await syncRemoteState(userId).catch(() => undefined);
        }
      } catch (error) {
        if (!isRemoteNetworkError(error) || !userId) {
          throw error;
        }

        await applyRemoteGoalPatch(userId, id, nextInput);
        await enqueueRemoteMutation({
          kind: "patch-goal",
          userId,
          id,
          input: nextInput
        });
      }

      return;
    }

    if (!db) {
      await updateLocalState((state) => ({
        state: {
          ...state,
          goals: state.goals.map((goal) =>
            goal.id === id
              ? {
                  ...goal,
                  ...input,
                  updatedAt: buildLocalTimestamp()
                }
              : goal
          )
        },
        result: undefined
      }));

      return;
    }

    await updateDoc(doc(db!, "goals", id), {
      ...input,
      updatedAt: serverTimestamp()
    });
  }
};
