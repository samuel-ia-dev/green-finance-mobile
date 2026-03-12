import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Transaction } from "@/types/finance";
import { formatCurrency } from "@/utils/format";

function isWebRuntime() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getMonthlyTransactions(transactions: Transaction[], monthKey: string) {
  return transactions.filter((transaction) => transaction.date.startsWith(monthKey));
}

function getTransactionStatus(transaction: Transaction) {
  if (transaction.type === "income") {
    return "recebido";
  }

  return transaction.isPaid ? "pago" : "em aberto";
}

function summarizeTransactions(transactions: Transaction[]) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === "income") {
        summary.income += transaction.amount;
      } else {
        summary.expenses += transaction.amount;
        if (!transaction.isPaid) {
          summary.openExpenses += transaction.amount;
        }
      }

      return summary;
    },
    {
      income: 0,
      expenses: 0,
      openExpenses: 0
    }
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCsv(transactions: Transaction[]) {
  const header = "data,tipo,categoria,descricao,valor,recorrente,status";
  const rows = transactions.map((transaction) =>
    [
      transaction.date,
      transaction.type,
      transaction.categoryName,
      `"${transaction.description.replace(/"/g, '""')}"`,
      transaction.amount.toFixed(2),
      transaction.isRecurring ? "sim" : "nao",
      getTransactionStatus(transaction)
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

function buildHtml(transactions: Transaction[], monthKey: string) {
  const summary = summarizeTransactions(transactions);
  const balance = summary.income - summary.expenses;
  const rows = transactions
    .map(
      (transaction) =>
        `<tr>
          <td>${escapeHtml(transaction.date)}</td>
          <td>${escapeHtml(transaction.type === "income" ? "Receita" : "Despesa")}</td>
          <td>${escapeHtml(transaction.categoryName)}</td>
          <td>${escapeHtml(transaction.description)}</td>
          <td>${formatCurrency(transaction.amount)}</td>
          <td>${transaction.isRecurring ? "Sim" : "Não"}</td>
          <td>${escapeHtml(getTransactionStatus(transaction))}</td>
        </tr>`
    )
    .join("");
  const tableRows =
    rows ||
    `<tr><td colspan="7" style="text-align:center; color:#64748B;">Nenhum lançamento financeiro encontrado para ${escapeHtml(monthKey)}.</td></tr>`;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Relatório financeiro ${monthKey}</title>
      </head>
      <body style="font-family: Arial; padding: 24px;">
        <h1>Relatório financeiro ${monthKey}</h1>
        <div style="display:grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 12px; margin: 24px 0;">
          <div style="border:1px solid #CBD5E1; border-radius: 16px; padding: 14px;">
            <div style="font-size:12px; color:#64748B;">Receitas</div>
            <div style="font-size:20px; font-weight:700;">${formatCurrency(summary.income)}</div>
          </div>
          <div style="border:1px solid #CBD5E1; border-radius: 16px; padding: 14px;">
            <div style="font-size:12px; color:#64748B;">Despesas</div>
            <div style="font-size:20px; font-weight:700;">${formatCurrency(summary.expenses)}</div>
          </div>
          <div style="border:1px solid #CBD5E1; border-radius: 16px; padding: 14px;">
            <div style="font-size:12px; color:#64748B;">Saldo</div>
            <div style="font-size:20px; font-weight:700;">${formatCurrency(balance)}</div>
          </div>
          <div style="border:1px solid #CBD5E1; border-radius: 16px; padding: 14px;">
            <div style="font-size:12px; color:#64748B;">Em aberto</div>
            <div style="font-size:20px; font-weight:700;">${formatCurrency(summary.openExpenses)}</div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse;" border="1" cellspacing="0" cellpadding="8">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Recorrente</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

async function shareIfPossible(uri: string) {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri);
  }
}

function downloadWebTextFile(content: string, filename: string, mimeType: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Exportação web indisponível neste ambiente.");
  }

  const blob = new Blob(["\uFEFF", content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body?.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 2000);
  return filename;
}

async function printWebReport(html: string, monthKey: string) {
  if (typeof window === "undefined") {
    throw new Error("Impressão web indisponível neste ambiente.");
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body?.appendChild(iframe);

  const frameDocument = iframe.contentWindow?.document;
  const frameWindow = iframe.contentWindow;

  if (!frameDocument || !frameWindow) {
    iframe.remove();
    throw new Error("Não foi possível preparar o relatório financeiro para impressão.");
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      resolve();
    }, 250);
  });

  window.setTimeout(() => {
    iframe.remove();
  }, 1500);

  return `web-print://transactions-${monthKey}.pdf`;
}

export const exportService = {
  async exportCsv(transactions: Transaction[], monthKey: string) {
    const monthlyTransactions = getMonthlyTransactions(transactions, monthKey);
    const filename = `transactions-${monthKey}.csv`;

    if (isWebRuntime()) {
      return downloadWebTextFile(buildCsv(monthlyTransactions), filename, "text/csv;charset=utf-8");
    }

    const uri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, buildCsv(monthlyTransactions), {
      encoding: "utf8" as never
    });
    await shareIfPossible(uri);
    return uri;
  },

  async exportPdf(transactions: Transaction[], monthKey: string) {
    const monthlyTransactions = getMonthlyTransactions(transactions, monthKey);

    if (isWebRuntime()) {
      return printWebReport(buildHtml(monthlyTransactions, monthKey), monthKey);
    }

    const file = await Print.printToFileAsync({
      html: buildHtml(monthlyTransactions, monthKey)
    });
    await shareIfPossible(file.uri);
    return file.uri;
  }
};
