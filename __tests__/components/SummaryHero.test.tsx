import { render } from "@testing-library/react-native";
import { SummaryHero } from "@/components/SummaryHero";

describe("SummaryHero", () => {
  it("shows the financial health summary with month commitment", () => {
    const screen = render(
      <SummaryHero balance={510} healthStatus="healthy" monthlyExpenses={700} monthlyIncome={2500} />
    );

    expect(screen.getByText("Saldo do mês")).toBeTruthy();
    expect(screen.getByText("Saúde financeira")).toBeTruthy();
    expect(screen.getByText("Saudável")).toBeTruthy();
    expect(screen.getByText("Comprometimento: 28%")).toBeTruthy();
    expect(screen.getByText("R$ 700,00 comprometidos de R$ 2.500,00 no mês")).toBeTruthy();
  });

  it("shows a critical state when there are expenses but no revenue in the month", () => {
    const screen = render(
      <SummaryHero balance={-300} healthStatus="critical" monthlyExpenses={300} monthlyIncome={0} />
    );

    expect(screen.getByText("Saldo do mês")).toBeTruthy();
    expect(screen.getByText("Crítica")).toBeTruthy();
    expect(screen.getByText("Comprometimento: 100%")).toBeTruthy();
    expect(screen.getByText("R$ 300,00 em despesas e nenhuma receita lançada no mês")).toBeTruthy();
  });
});
