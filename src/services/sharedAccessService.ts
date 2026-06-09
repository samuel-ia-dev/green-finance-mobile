import { cacheService } from "@/services/cacheService";
import { remoteBackendService } from "@/services/remoteBackendService";
import { AuthUser, Category, FinanceHydrationPayload, Goal, Transaction, UserSettings } from "@/types/finance";

const LOCAL_FINANCE_KEY = "green-finance-local-finance";
const REMOTE_MIGRATIONS_KEY = "green-finance.remote-migrations";

const defaultCategories = [
  { name: "Alimentação", color: "#B7F53B", icon: "restaurant-outline" },
  { name: "Transporte", color: "#31E1F7", icon: "car-outline" },
  { name: "Moradia", color: "#22C55E", icon: "home-outline" },
  { name: "Saúde", color: "#EF4444", icon: "medkit-outline" },
  { name: "Educação", color: "#34D399", icon: "school-outline" },
  { name: "Lazer", color: "#87E64B", icon: "game-controller-outline" },
  { name: "Investimentos", color: "#2DD4BF", icon: "trending-up-outline" },
  { name: "Outros", color: "#64748B", icon: "apps-outline" }
] as const;

type MigrationRegistry = Record<string, string>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildLocalUid(email: string) {
  return `local-${email.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user"}`;
}

function buildDefaultCategoryId(userId: string, name: string) {
  return `${userId}-${name}`;
}

function buildDefaultCategories(userId: string, now: string): Category[] {
  return defaultCategories.map((category) => ({
    id: buildDefaultCategoryId(userId, category.name),
    userId,
    ...category,
    createdAt: now,
    updatedAt: now
  }));
}

async function getMigrationRegistry() {
  return (await cacheService.getItem<MigrationRegistry>(REMOTE_MIGRATIONS_KEY, {})) ?? {};
}

async function saveMigrationRegistry(registry: MigrationRegistry) {
  await cacheService.setItem(REMOTE_MIGRATIONS_KEY, registry);
}

function buildCategoryRemap(localCategories: Category[], remoteUserId: string, now: string) {
  const nextCategories: Category[] = [];
  const localToRemoteCategoryIds = new Map<string, string>();
  const existingRemoteIds = new Set<string>();

  localCategories.forEach((category) => {
    const defaultCategory = defaultCategories.find((item) => item.name === category.name);
    const nextId = defaultCategory ? buildDefaultCategoryId(remoteUserId, defaultCategory.name) : category.id;

    localToRemoteCategoryIds.set(category.id, nextId);

    if (existingRemoteIds.has(nextId)) {
      return;
    }

    existingRemoteIds.add(nextId);
    nextCategories.push({
      ...category,
      id: nextId,
      userId: remoteUserId,
      createdAt: category.createdAt ?? now,
      updatedAt: category.updatedAt ?? now
    });
  });

  buildDefaultCategories(remoteUserId, now).forEach((category) => {
    if (existingRemoteIds.has(category.id)) {
      return;
    }

    existingRemoteIds.add(category.id);
    nextCategories.push(category);
  });

  return {
    categories: nextCategories,
    localToRemoteCategoryIds
  };
}

function migrateTransactions(transactions: Transaction[], remoteUserId: string, localToRemoteCategoryIds: Map<string, string>, now: string) {
  return transactions.map((transaction) => ({
    ...transaction,
    userId: remoteUserId,
    categoryId:
      localToRemoteCategoryIds.get(transaction.categoryId) ??
      (defaultCategories.some((category) => category.name === transaction.categoryName)
        ? buildDefaultCategoryId(remoteUserId, transaction.categoryName)
        : transaction.categoryId),
    createdAt: transaction.createdAt ?? now,
    updatedAt: transaction.updatedAt ?? now
  }));
}

function migrateGoals(goals: Goal[], remoteUserId: string, now: string) {
  return goals.map((goal) => ({
    ...goal,
    userId: remoteUserId,
    createdAt: goal.createdAt ?? now,
    updatedAt: goal.updatedAt ?? now
  }));
}

function buildSettings(settings: UserSettings | undefined, email: string): UserSettings {
  const baseSettings: UserSettings = {
    currency: "BRL",
    theme: "system"
  };

  return {
    ...baseSettings,
    ...settings,
    email
  };
}

export const sharedAccessService = {
  async migrateLocalDataToSharedAccount(user: AuthUser, email: string) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !user.uid) {
      return false;
    }

    const migrationRegistry = await getMigrationRegistry();

    if (migrationRegistry[normalizedEmail] === user.uid) {
      return false;
    }

    const localState = await cacheService.getItem<FinanceHydrationPayload | null>(LOCAL_FINANCE_KEY, null);

    if (!localState) {
      await saveMigrationRegistry({
        ...migrationRegistry,
        [normalizedEmail]: user.uid
      });
      return false;
    }

    const localUserId = buildLocalUid(normalizedEmail);
    const localTransactions = localState.transactions.filter((transaction) => transaction.userId === localUserId);
    const localCategories = localState.categories.filter((category) => category.userId === localUserId);
    const localGoals = localState.goals.filter((goal) => goal.userId === localUserId);
    const hasUserData = Boolean(localTransactions.length || localCategories.length || localGoals.length);

    if (!hasUserData) {
      await saveMigrationRegistry({
        ...migrationRegistry,
        [normalizedEmail]: user.uid
      });
      return false;
    }

    const now = new Date().toISOString();
    const { categories, localToRemoteCategoryIds } = buildCategoryRemap(localCategories, user.uid, now);
    const transactions = migrateTransactions(localTransactions, user.uid, localToRemoteCategoryIds, now);
    const goals = migrateGoals(localGoals, user.uid, now);
    const settings = buildSettings(localState.settings, normalizedEmail);

    await remoteBackendService.bulkUpsert("categories", categories);

    if (goals.length) {
      await remoteBackendService.bulkUpsert("goals", goals);
    }

    if (transactions.length) {
      await remoteBackendService.bulkUpsert("transactions", transactions);
    }

    await remoteBackendService.saveSettings(settings);
    await saveMigrationRegistry({
      ...migrationRegistry,
      [normalizedEmail]: user.uid
    });

    return true;
  }
};
