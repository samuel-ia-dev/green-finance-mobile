import { useEffect } from "react";
import { FinanceHydrationPayload, Transaction } from "@/types/finance";
import { useAuthSession } from "@/context/AuthSessionContext";
import { cacheService } from "@/services/cacheService";
import { firestoreService } from "@/services/firestoreService";
import { useFinanceStore } from "@/store/useFinanceStore";
import { buildRecurringInstallments, isSameRecurringSeries, resolveRecurringEndDate, resolveRecurringGenerationHorizon } from "@/utils/recurring";

const emptyPayload: FinanceHydrationPayload = {
  transactions: [],
  categories: [],
  goals: [],
  settings: {
    theme: "system",
    currency: "BRL"
  }
};

const recurringCoverageRunningUsers = new Set<string>();
const pendingRecurringCoverageByUser = new Map<string, Transaction[]>();

async function ensureRecurringCoverage(userId: string, transactions: Transaction[]) {
  const templates = transactions.filter(
    (transaction) =>
      transaction.isRecurring &&
      !transaction.parentRecurringId &&
      transaction.type === "expense" &&
      transaction.recurringFrequency &&
      transaction.recurringStartDate
  );

  for (const template of templates) {
    const recurringEndDate = resolveRecurringEndDate(template.recurringStartDate!, template.recurringEndDate);
    const generationHorizon = resolveRecurringGenerationHorizon(template.recurringStartDate!, template.recurringEndDate, new Date());
    const relatedDates = transactions
      .filter((transaction) => isSameRecurringSeries(transaction, template))
      .map((transaction) => transaction.date);

    const generated = buildRecurringInstallments({
      amount: template.amount,
      categoryId: template.categoryId,
      categoryName: template.categoryName,
      description: template.description,
      config: {
        frequency: template.recurringFrequency!,
        startDate: template.recurringStartDate!,
        endDate: recurringEndDate
      },
      existingDates: relatedDates,
      parentRecurringId: template.id,
      referenceDate: new Date(),
      userId
    }).filter((transaction) => transaction.date <= generationHorizon);

    if (!generated.length) {
      continue;
    }

    await firestoreService.createGeneratedRecurringTransactions(
      generated.map((transaction) => ({
        ...transaction,
        userId
      }))
    );
  }
}

async function scheduleRecurringCoverage(userId: string, transactions: Transaction[]) {
  pendingRecurringCoverageByUser.set(userId, transactions);

  if (recurringCoverageRunningUsers.has(userId)) {
    return;
  }

  recurringCoverageRunningUsers.add(userId);

  try {
    while (pendingRecurringCoverageByUser.has(userId)) {
      const nextTransactions = pendingRecurringCoverageByUser.get(userId);
      pendingRecurringCoverageByUser.delete(userId);

      if (!nextTransactions) {
        continue;
      }

      await ensureRecurringCoverage(userId, nextTransactions);
    }
  } finally {
    recurringCoverageRunningUsers.delete(userId);

    if (pendingRecurringCoverageByUser.has(userId)) {
      void scheduleRecurringCoverage(userId, pendingRecurringCoverageByUser.get(userId)!);
    }
  }
}

export function useFinanceRealtime() {
  const user = useAuthSession().user;
  const hydrate = useFinanceStore((state) => state.hydrate);
  const setTransactions = useFinanceStore((state) => state.setTransactions);
  const setCategories = useFinanceStore((state) => state.setCategories);
  const setGoals = useFinanceStore((state) => state.setGoals);
  const setSettings = useFinanceStore((state) => state.setSettings);
  const isSyncing = useFinanceStore((state) => state.isSyncing);
  const setSyncing = useFinanceStore((state) => state.setSyncing);

  useEffect(() => {
    let mounted = true;

    async function hydrateFromCache() {
      const payload = await cacheService.getItem<FinanceHydrationPayload>("finance-cache", emptyPayload);
      if (mounted && payload) {
        hydrate(payload);
      }
    }

    hydrateFromCache();

    if (!user?.uid) {
      return () => {
        mounted = false;
      };
    }

    setSyncing(true);
    firestoreService.ensureDefaultCategories(user.uid).catch(() => undefined);

    // Os listeners mantêm o app sincronizado em tempo real e atualizam o cache local para uso offline básico.
    const unsubscribers = [
      firestoreService.subscribeToTransactions(user.uid, async (transactions) => {
        setTransactions(transactions);
        const snapshot = useFinanceStore.getState();
        await cacheService.setItem("finance-cache", {
          transactions,
          categories: snapshot.categories,
          goals: snapshot.goals,
          settings: snapshot.settings
        });
        void scheduleRecurringCoverage(user.uid, transactions).catch(() => undefined);
        setSyncing(false);
      }),
      firestoreService.subscribeToCategories(user.uid, async (categories) => {
        setCategories(categories);
        const snapshot = useFinanceStore.getState();
        await cacheService.setItem("finance-cache", {
          transactions: snapshot.transactions,
          categories,
          goals: snapshot.goals,
          settings: snapshot.settings
        });
      }),
      firestoreService.subscribeToGoals(user.uid, async (goals) => {
        setGoals(goals);
        const snapshot = useFinanceStore.getState();
        await cacheService.setItem("finance-cache", {
          transactions: snapshot.transactions,
          categories: snapshot.categories,
          goals,
          settings: snapshot.settings
        });
      }),
      firestoreService.subscribeToSettings(user.uid, async (settings) => {
        if (settings) {
          setSettings(settings);
          const snapshot = useFinanceStore.getState();
          await cacheService.setItem("finance-cache", {
            transactions: snapshot.transactions,
            categories: snapshot.categories,
            goals: snapshot.goals,
            settings: snapshot.settings
          });
        }
      })
    ];

    return () => {
      mounted = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.uid, hydrate, setTransactions, setCategories, setGoals, setSettings, setSyncing]);

  return {
    isSyncing
  };
}
