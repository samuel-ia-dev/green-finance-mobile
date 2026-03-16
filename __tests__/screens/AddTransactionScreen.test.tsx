import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AddTransactionScreen } from "@/screens/AddTransactionScreen";
import { firestoreService } from "@/services/firestoreService";

const mockAddTransaction = jest.fn();
const mockUpdateTransactionLocal = jest.fn();
const mockClearEditingTransaction = jest.fn();
let mockEditingTransaction: Record<string, unknown> | null = null;

jest.mock("@/context/AuthSessionContext", () => ({
  useAuthSession: () => ({
    user: {
      uid: "user-1"
    }
  })
}));

jest.mock("@/services/firestoreService", () => ({
  firestoreService: {
    createTransaction: jest.fn(),
    updateTransaction: jest.fn()
  }
}));

jest.mock("@/store/useFinanceStore", () => ({
  useFinanceStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      transactions: [],
      editingTransaction: mockEditingTransaction,
      addTransaction: mockAddTransaction,
      updateTransactionLocal: mockUpdateTransactionLocal,
      clearEditingTransaction: mockClearEditingTransaction
    })
}));

describe("AddTransactionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditingTransaction = null;
    (firestoreService.createTransaction as jest.Mock).mockResolvedValue("tx-1");
    (firestoreService.updateTransaction as jest.Mock).mockResolvedValue(undefined);
  });

  it("shows recurring fields only for recurring expenses", () => {
    const screen = render(<AddTransactionScreen />);

    fireEvent.press(screen.getByText("Despesa"));
    fireEvent.press(screen.getByText("Marcar recorrente"));

    expect(screen.getByText("Frequência")).toBeTruthy();
    expect(screen.getByText("Data de início")).toBeTruthy();
  });

  it("uses a numeric input for the amount field", () => {
    const screen = render(<AddTransactionScreen />);
    const amountInput = screen.getByPlaceholderText("Valor");

    expect(amountInput.props.inputMode).toBe("decimal");
    expect(amountInput.props.autoComplete).toBe("off");
    expect(amountInput.props.autoCorrect).toBe(false);
    expect(amountInput.props.importantForAutofill).toBe("no");
    expect(amountInput.props.spellCheck).toBe(false);
    expect(amountInput.props.textContentType).toBe("none");
  });

  it("creates a new expense as unpaid by default", async () => {
    const screen = render(<AddTransactionScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Valor"), "120");
    fireEvent.changeText(screen.getByPlaceholderText("Descrição"), "Internet");
    fireEvent.press(screen.getByText("Salvar transação"));

    await waitFor(() => {
      expect(firestoreService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          isPaid: false
        })
      );
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "tx-1",
          isPaid: false
        })
      );
    });
  });

  it("keeps a recurring expense without a fixed end date when the field is empty", async () => {
    const screen = render(<AddTransactionScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Valor"), "120");
    fireEvent.changeText(screen.getByPlaceholderText("Descrição"), "Internet");
    fireEvent.press(screen.getByText("Marcar recorrente"));
    fireEvent.press(screen.getByText("Salvar transação"));

    await waitFor(() => {
      expect(firestoreService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          isRecurring: true,
          recurringStartDate: "2026-03-10",
          recurringEndDate: undefined
        })
      );
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          recurringEndDate: undefined
        })
      );
    });
  });

  it("saves an existing transaction in editing mode", async () => {
    mockEditingTransaction = {
      id: "tx-9",
      userId: "user-1",
      type: "expense",
      amount: 90,
      categoryId: "housing",
      categoryName: "Moradia",
      description: "Internet",
      date: "2026-03-10",
      isRecurring: false,
      isPaid: true,
      createdAt: "2026-03-10",
      updatedAt: "2026-03-10"
    };

    const screen = render(<AddTransactionScreen />);

    expect(screen.getByDisplayValue("Internet")).toBeTruthy();
    expect(screen.getByText("Salvar alterações")).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("Descrição"), "Internet fibra");
    fireEvent.press(screen.getByText("Salvar alterações"));

    await waitFor(() => {
      expect(firestoreService.updateTransaction).toHaveBeenCalledWith(
        "tx-9",
        expect.objectContaining({
          description: "Internet fibra",
          isPaid: true
        })
      );
      expect(mockUpdateTransactionLocal).toHaveBeenCalledWith(
        "tx-9",
        expect.objectContaining({
          description: "Internet fibra",
          isPaid: true
        })
      );
      expect(mockClearEditingTransaction).toHaveBeenCalled();
    });
  });
});
