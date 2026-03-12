import { Transaction } from "@/types/finance";
import { formatCurrency } from "@/utils/format";

function totalExpensesByCategory(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce<Record<string, { categoryName: string; amount: number }>>((accumulator, transaction) => {
      const current = accumulator[transaction.categoryId] ?? {
        categoryName: transaction.categoryName,
        amount: 0
      };
      accumulator[transaction.categoryId] = {
        categoryName: current.categoryName,
        amount: current.amount + transaction.amount
      };
      return accumulator;
    }, {});
}

export function buildInsights(currentMonthTransactions: Transaction[], previousMonthTransactions: Transaction[], _monthKey: string) {
  const currentByCategory = totalExpensesByCategory(currentMonthTransactions);
  const previousByCategory = totalExpensesByCategory(previousMonthTransactions);
  const insights: string[] = [];

  Object.entries(currentByCategory).forEach(([categoryId, current]) => {
    const previous = previousByCategory[categoryId];
    if (!previous || previous.amount === 0) {
      return;
    }

    const delta = Math.round(((current.amount - previous.amount) / previous.amount) * 100);
    if (delta !== 0) {
      insights.push(`Você gastou ${Math.abs(delta)}% ${delta > 0 ? "mais" : "menos"} em ${current.categoryName} este mês.`);
    }
  });

  const topCategory = Object.values(currentByCategory).sort((left, right) => right.amount - left.amount)[0];
  if (topCategory) {
    insights.push(`Sua maior categoria do mês foi ${topCategory.categoryName}, com ${formatCurrency(topCategory.amount)}.`);
  }

  const recurringTotal = currentMonthTransactions
    .filter((transaction) => transaction.isRecurring && transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  if (recurringTotal > 0) {
    insights.push(`As despesas recorrentes já consomem ${formatCurrency(recurringTotal)} do seu orçamento mensal.`);
  }

  return insights;
}
