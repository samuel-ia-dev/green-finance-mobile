export type TransactionType = "income" | "expense";
export type RecurringFrequency = "weekly" | "monthly" | "yearly";
export type ThemePreference = "light" | "dark" | "system";

export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringStartDate?: string;
  recurringEndDate?: string;
  parentRecurringId?: string;
  isPaid?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TransactionInput = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

export type RecurringConfig = {
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
};

export type Category = {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
};

export type Goal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
  updatedAt: string;
};

export type UserSettings = {
  theme: ThemePreference;
  currency: string;
  displayName?: string;
  email?: string;
};

export type GoalProgress = Goal & {
  percent: number;
  status: "on-track" | "attention" | "completed";
};

export type CategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent: number;
};

export type DashboardSummary = {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recurringTotal: number;
  healthStatus: "healthy" | "attention" | "critical";
  categoryBreakdown: CategoryBreakdown[];
  recentTransactions: Transaction[];
  recurringTransactions: Transaction[];
  goalProgress: GoalProgress[];
  insights: string[];
};

export type HistoryFilterOptions = {
  month?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
};

export type AuthUser = {
  uid: string;
  email?: string | null;
};

export type FinanceHydrationPayload = {
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  settings: UserSettings;
};
