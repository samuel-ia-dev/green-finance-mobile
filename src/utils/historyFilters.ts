import { HistoryFilterOptions, Transaction } from "@/types/finance";

export function filterTransactions(transactions: Transaction[], filters: HistoryFilterOptions) {
  return [...transactions]
    .filter((transaction) => {
      if (filters.month && !transaction.date.startsWith(filters.month)) {
        return false;
      }
      if (filters.categoryId && transaction.categoryId !== filters.categoryId) {
        return false;
      }
      if (filters.type && transaction.type !== filters.type) {
        return false;
      }
      if (filters.search) {
        const haystack = `${transaction.description} ${transaction.categoryName}`.toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) {
          return false;
        }
      }
      return true;
    })
    .sort((left, right) => right.date.localeCompare(left.date));
}
