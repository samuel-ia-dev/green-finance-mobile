import { render } from "@testing-library/react-native";
import { CategoryChart } from "@/components/CategoryChart";
import { formatCurrency } from "@/utils/format";

describe("CategoryChart", () => {
  it("renders an empty state when there are no category expenses", () => {
    const screen = render(<CategoryChart data={[]} healthStatus="healthy" monthlyExpenses={0} monthlyIncome={0} />);

    expect(screen.getByText("Sem gastos por categoria neste período.")).toBeTruthy();
  });

  it("renders the line chart with legend and total amount", () => {
    const screen = render(
      <CategoryChart
        data={[
          {
            categoryId: "housing",
            categoryName: "Moradia",
            amount: 190,
            percent: 38
          },
          {
            categoryId: "food",
            categoryName: "Alimentação",
            amount: 500,
            percent: 62
          }
        ]}
        healthStatus="attention"
        monthlyExpenses={690}
        monthlyIncome={1000}
      />
    );

    expect(screen.getByTestId("category-line-chart")).toBeTruthy();
    expect(screen.getByText("Comprometimento")).toBeTruthy();
    expect(screen.getByText("69%")).toBeTruthy();
    expect(screen.getByText("Maior categoria")).toBeTruthy();
    expect(screen.getByText("Ritmo do mês")).toBeTruthy();
    expect(screen.getAllByText("Moradia").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Alimentação").length).toBeGreaterThan(1);
    expect(screen.getByText(`${formatCurrency(690)} de ${formatCurrency(1000)}`)).toBeTruthy();
  });
});
