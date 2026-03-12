import { DashboardSummary, Goal, GoalProgress, Transaction } from "@/types/finance";
import { buildInsights } from "@/utils/insights";

function toGoalProgress(goal: Goal): GoalProgress {
  const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  const status = percent >= 100 ? "completed" : percent >= 50 ? "on-track" : "attention";
  return {
    ...goal,
    percent,
    status
  };
}

export function buildDashboardSummary(transactions: Transaction[], goals: Goal[], monthKey: string): DashboardSummary {
  const monthlyTransactions = transactions.filter((transaction) => transaction.date.startsWith(monthKey));
  const previousMonthDate = new Date(`${monthKey}-01T00:00:00`);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthKey = previousMonthDate.toISOString().slice(0, 7);
  const previousTransactions = transactions.filter((transaction) => transaction.date.startsWith(previousMonthKey));
  const monthlyOpenTransactions = monthlyTransactions.filter((transaction) => transaction.type === "income" || !transaction.isPaid);
  const previousOpenTransactions = previousTransactions.filter((transaction) => transaction.type === "income" || !transaction.isPaid);

  const monthlyIncome = monthlyTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const monthlyExpenses = monthlyOpenTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const balance = monthlyTransactions.reduce((total, transaction) => {
    return total + (transaction.type === "income" ? transaction.amount : -transaction.amount);
  }, 0);

  const recurringTransactions = monthlyTransactions.filter((transaction) => transaction.isRecurring && transaction.type === "expense");
  const recurringTotal = recurringTransactions.filter((transaction) => !transaction.isPaid).reduce((total, transaction) => total + transaction.amount, 0);

  const expenseByCategory = monthlyOpenTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce<Record<string, { categoryId: string; categoryName: string; amount: number }>>((accumulator, transaction) => {
      const current = accumulator[transaction.categoryId] ?? {
        categoryId: transaction.categoryId,
        categoryName: transaction.categoryName,
        amount: 0
      };
      accumulator[transaction.categoryId] = {
        ...current,
        amount: current.amount + transaction.amount
      };
      return accumulator;
    }, {});

  const categoryBreakdown = Object.values(expenseByCategory)
    .sort((left, right) => right.amount - left.amount)
    .map((item) => ({
      ...item,
      percent: monthlyExpenses ? Math.round((item.amount / monthlyExpenses) * 100) : 0
    }));

  const expenseRate = monthlyIncome === 0 ? 1 : monthlyExpenses / monthlyIncome;
  const healthStatus = expenseRate <= 0.7 ? "healthy" : expenseRate <= 0.9 ? "attention" : "critical";

  return {
    balance,
    monthlyIncome,
    monthlyExpenses,
    recurringTotal,
    healthStatus,
    categoryBreakdown,
    recentTransactions: [...monthlyTransactions].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 5),
    recurringTransactions,
    goalProgress: goals.map(toGoalProgress),
    insights: buildInsights(monthlyOpenTransactions, previousOpenTransactions, monthKey)
  };
}
