import { Transaction } from "@/types/finance";

const keywordMap = new Map<string, string>([
  ["uber", "Transporte"],
  ["99", "Transporte"],
  ["mercado", "Alimentação"],
  ["ifood", "Alimentação"],
  ["farm", "Saúde"],
  ["consulta", "Saúde"],
  ["aluguel", "Moradia"],
  ["internet", "Moradia"],
  ["netflix", "Lazer"],
  ["cinema", "Lazer"],
  ["escola", "Educação"],
  ["curso", "Educação"],
  ["invest", "Investimentos"]
]);

export function suggestCategory(description: string, history: Transaction[]) {
  const normalized = description.toLowerCase();
  for (const [keyword, category] of keywordMap.entries()) {
    if (normalized.includes(keyword)) {
      return category;
    }
  }

  const fromHistory = history.find((transaction) =>
    normalized.split(" ").some((token) => token && transaction.description.toLowerCase().includes(token))
  );

  return fromHistory?.categoryName ?? "Outros";
}
