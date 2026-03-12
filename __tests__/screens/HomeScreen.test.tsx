import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { HomeScreen } from "@/screens/HomeScreen";
import { firestoreService } from "@/services/firestoreService";

const mockUpdateTransactionLocal = jest.fn();
const mockRemoveTransaction = jest.fn();
const mockSetEditingTransaction = jest.fn();
const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({
    navigate: mockNavigate
  })
}));

jest.mock("@/hooks/useFinanceRealtime", () => ({
  useFinanceRealtime: () => ({
    isSyncing: false
  })
}));

jest.mock("@/services/firestoreService", () => ({
  firestoreService: {
    deleteTransaction: jest.fn(),
    updateTransaction: jest.fn()
  }
}));

jest.mock("@/store/useFinanceStore", () => ({
  useFinanceStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        transactions: [
          {
            id: "income-1",
            userId: "user-1",
            categoryId: "salary",
            categoryName: "Salário",
            description: "Pagamento",
            amount: 5000,
            type: "income",
            date: "2026-03-12",
            isRecurring: false,
            createdAt: "2026-03-12T10:00:00.000Z",
            updatedAt: "2026-03-12T10:00:00.000Z"
          },
          {
            id: "3",
            userId: "user-1",
            categoryId: "housing",
            categoryName: "Casa",
            description: "Aluguel",
            amount: 700,
            type: "expense",
            date: "2026-03-12",
            isRecurring: true,
            isPaid: true,
            createdAt: "2026-03-12T09:00:00.000Z",
            updatedAt: "2026-03-12T09:00:00.000Z"
          },
          {
            id: "2",
            userId: "user-1",
            categoryId: "food",
            categoryName: "Alimentação",
            description: "Mercado",
            amount: 200,
            type: "expense",
            date: "2026-03-11",
            isRecurring: false,
            isPaid: false,
            createdAt: "2026-03-11T10:00:00.000Z",
            updatedAt: "2026-03-11T10:00:00.000Z"
          },
          {
            id: "1",
            userId: "user-1",
            categoryId: "housing",
            categoryName: "Moradia",
            description: "Internet",
            amount: 120,
            type: "expense",
            date: "2026-03-10",
            isRecurring: true,
            isPaid: false,
            createdAt: "2026-03-10T10:00:00.000Z",
            updatedAt: "2026-03-10T10:00:00.000Z"
          },
          {
            id: "4",
            userId: "user-1",
            categoryId: "health",
            categoryName: "Saúde",
            description: "Plano",
            amount: 310,
            type: "expense",
            date: "2026-04-08",
            isRecurring: false,
            isPaid: false,
            createdAt: "2026-04-08T10:00:00.000Z",
            updatedAt: "2026-04-08T10:00:00.000Z"
          }
        ],
        goals: [],
        removeTransaction: mockRemoveTransaction,
        setEditingTransaction: mockSetEditingTransaction,
        updateTransactionLocal: mockUpdateTransactionLocal,
        dashboard: {
          balance: 4680,
          monthlyIncome: 5000,
          monthlyExpenses: 320,
          recurringTotal: 120,
          healthStatus: "healthy",
          categoryBreakdown: [
            { categoryId: "housing", categoryName: "Moradia", amount: 120, percent: 38 }
          ],
          recentTransactions: [],
          recurringTransactions: [
            {
              id: "1",
              userId: "user-1",
              categoryId: "housing",
              categoryName: "Moradia",
              description: "Internet",
              amount: 120,
              type: "expense",
              date: "2026-03-10",
              isRecurring: true,
              isPaid: false,
              createdAt: "2026-03-10T10:00:00.000Z",
              updatedAt: "2026-03-10T10:00:00.000Z"
            },
            {
              id: "3",
              userId: "user-1",
              categoryId: "housing",
              categoryName: "Casa",
              description: "Aluguel",
              amount: 700,
              type: "expense",
              date: "2026-03-12",
              isRecurring: true,
              isPaid: true,
              createdAt: "2026-03-12T09:00:00.000Z",
              updatedAt: "2026-03-12T09:00:00.000Z"
            }
          ],
          goalProgress: []
        }
      }),
    {
      getState: jest.fn()
    }
  )
}));

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));
    (firestoreService.deleteTransaction as jest.Mock).mockResolvedValue(undefined);
    (firestoreService.updateTransaction as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders financial summary and recurring card", () => {
    const screen = render(<HomeScreen />);

    expect(screen.getByText("Saldo do mês")).toBeTruthy();
    expect(screen.getByText("R$ 3.980,00")).toBeTruthy();
    expect(screen.getByText("Calendario")).toBeTruthy();
    expect(screen.getByText("Periodo selecionado")).toBeTruthy();
    expect(screen.getByText("Março 2026")).toBeTruthy();
    expect(screen.getByLabelText("Abrir calendario mensal")).toBeTruthy();
    expect(screen.getByText("Saúde financeira")).toBeTruthy();
    expect(screen.getAllByText("Saudável").length).toBeGreaterThan(0);
    expect(screen.getByTestId("category-line-chart")).toBeTruthy();
    expect(screen.getByText("Comprometimento")).toBeTruthy();
    expect(screen.getByText("6%")).toBeTruthy();
    expect(screen.getByText("Maior categoria")).toBeTruthy();
    expect(screen.getByText("Despesas recorrentes de Março 2026")).toBeTruthy();
    expect(screen.getByText("Despesas lançadas em Março 2026")).toBeTruthy();
    expect(screen.getByTestId("launched-expenses-scroll")).toBeTruthy();
    expect(screen.getAllByText("Internet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aluguel").length).toBeGreaterThan(0);
    expect(screen.getByText("Mercado")).toBeTruthy();
    expect(screen.queryByText("Plano")).toBeNull();
    expect(screen.queryByText("Pagamento")).toBeNull();
    expect(screen.getAllByLabelText("Marcar Internet como paga").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Marcar Mercado como paga")).toBeTruthy();
    expect(screen.getByLabelText("Editar Mercado")).toBeTruthy();
    expect(screen.getByLabelText("Excluir Mercado")).toBeTruthy();
  });

  it("updates the payment status from the PG control", async () => {
    const screen = render(<HomeScreen />);

    fireEvent.press(screen.getAllByLabelText("Marcar Internet como paga")[0]);

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

  it("switches the initial screen to another month through the calendar selector", () => {
    const screen = render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText("Abrir calendario mensal"));

    expect(screen.getByLabelText("Ano anterior")).toBeTruthy();
    expect(screen.getByLabelText("Ano seguinte")).toBeTruthy();
    expect(screen.getByText("2026")).toBeTruthy();
    expect(screen.getByText("Janeiro")).toBeTruthy();
    expect(screen.getByText("Abril")).toBeTruthy();
    expect(screen.getByText("Agosto")).toBeTruthy();
    expect(screen.getByText("Setembro")).toBeTruthy();
    expect(screen.getByText("Outubro")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Ano seguinte"));
    expect(screen.getByText("2027")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Ano anterior"));
    fireEvent.press(screen.getByLabelText("Selecionar Abril de 2026"));

    expect(screen.getByText("Despesas lançadas em Abril 2026")).toBeTruthy();
    expect(screen.getByText("Plano")).toBeTruthy();
    expect(screen.queryByText("Mercado")).toBeNull();
    expect(screen.queryByText("Internet")).toBeNull();
  });

  it("opens the add screen in editing mode from the expense list", () => {
    const screen = render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText("Editar Mercado"));

    expect(mockSetEditingTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "2",
        description: "Mercado"
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("Add");
  });

  it("deletes an expense from the expense list", async () => {
    const screen = render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText("Excluir Mercado"));

    await waitFor(() => {
      expect(firestoreService.deleteTransaction).toHaveBeenCalledWith("2");
      expect(mockRemoveTransaction).toHaveBeenCalledWith("2");
    });
  });
});
