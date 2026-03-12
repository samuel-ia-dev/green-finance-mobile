const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export function formatCurrency(value: number) {
  return brlFormatter.format(value);
}

export function formatShortDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

export function formatMonthYear(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
}

export function formatMonthChip(monthKey: string) {
  return `${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}`;
}

export function parseCurrencyInput(value: string) {
  const normalized = value.replace(/[^\d,]/g, "").replace(",", ".");
  return Number.parseFloat(normalized) || 0;
}

export function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const date = new Date(`${monthKey}-01T00:00:00`);
  date.setMonth(date.getMonth() + delta);
  return getMonthKey(date);
}
