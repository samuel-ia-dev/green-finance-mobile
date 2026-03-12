import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { firestoreService } from "@/services/firestoreService";
import { formatMonthChip } from "@/utils/format";

const mockRemoveTransaction = jest.fn();
const mockUpdateTransactionLocal = jest.fn();
const mockCurrentMonth = "2026-03";
const mockNextMonth = "2026-04";

jest.mock("@/services/firestoreService", () => ({
  firestoreService: {
    deleteTransaction: jest.fn(),
    updateTransaction: jest.fn()
  }
}));

jest.mock("@/store/useFinanceStore", () => ({
  useFinanceStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      transactions: [
        {
          id: "1",
          userId: "user-1",
          type: "expense",
          amount: 120,
          categoryId: "housing",
          categoryName: "Moradia",
          description: "Internet",
          date: `${mockCurrentMonth}-10`,
          isRecurring: true,
          recurringFrequency: "monthly",
          recurringStartDate: "2026-01-10",
          parentRecurringId: "rec-1",
          createdAt: `${mockCurrentMonth}-10`,
          updatedAt: `${mockCurrentMonth}-10`
        },
        {
          id: "2",
          userId: "user-1",
          type: "expense",
          amount: 95,
          categoryId: "health",
          categoryName: "Saúde",
          description: "Plano",
          date: `${mockNextMonth}-10`,
          isRecurring: true,
          recurringFrequency: "monthly",
          recurringStartDate: `${mockCurrentMonth}-10`,
          parentRecurringId: "rec-2",
          createdAt: `${mockNextMonth}-10`,
          updatedAt: `${mockNextMonth}-10`
        }
      ],
      removeTransaction: mockRemoveTransaction,
      updateTransactionLocal: mockUpdateTransactionLocal
    })
}));

describe("HistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(`${mockCurrentMonth}-11T12:00:00Z`));
    (firestoreService.deleteTransaction as jest.Mock).mockResolvedValue(undefined);
    (firestoreService.updateTransaction as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders recurring indicator and filters locally", () => {
    const screen = render(<HistoryScreen />);

    expect(screen.getByText("Internet")).toBeTruthy();
    expect(screen.getByText("🔁")).toBeTruthy();
    expect(screen.getByText("Moradia")).toBeTruthy();
    expect(screen.getByText(formatMonthChip(mockNextMonth))).toBeTruthy();

    fireEvent.press(screen.getByText("Despesa"));

    expect(screen.getByText("Moradia")).toBeTruthy();
  });

  it("allows browsing subsequent months", () => {
    const screen = render(<HistoryScreen />);

    fireEvent.press(screen.getByText(formatMonthChip(mockNextMonth)));

    expect(screen.getByText("Plano")).toBeTruthy();
    expect(screen.queryByText("Internet")).toBeNull();
  });

  it("shows an empty state when the selected filters return no transactions", () => {
    const screen = render(<HistoryScreen />);

    fireEvent.press(screen.getByText("Receita"));

    expect(screen.getByText("Nenhuma transação encontrada para os filtros selecionados.")).toBeTruthy();
  });

  it("deletes permanently before removing the item from the local store", async () => {
    const screen = render(<HistoryScreen />);

    fireEvent.press(screen.getByLabelText("Excluir Internet"));

    await waitFor(() => {
      expect(firestoreService.deleteTransaction).toHaveBeenCalledWith("1");
      expect(mockRemoveTransaction).toHaveBeenCalledWith("1");
    });

    expect((firestoreService.deleteTransaction as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(mockRemoveTransaction.mock.invocationCallOrder[0]);
  });

  it("flags an expense as paid through PG and persists the status", async () => {
    const screen = render(<HistoryScreen />);

    fireEvent.press(screen.getByLabelText("Marcar Internet como paga"));

    await waitFor(() => {
      expect(firestoreService.updateTransaction).toHaveBeenCalledWith("1", { isPaid: true });
      expect(mockUpdateTransactionLocal).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          isPaid: true
        })
      );
    });
  });
});
