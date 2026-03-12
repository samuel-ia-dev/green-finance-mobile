import { fireEvent, render } from "@testing-library/react-native";
import { TransactionRow } from "@/components/TransactionRow";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, name);
  }
}));

describe("TransactionRow", () => {
  it("shows small edit/delete actions and triggers the related callbacks", () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onTogglePaid = jest.fn();

    const screen = render(
      <TransactionRow
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePaid={onTogglePaid}
        transaction={{
          id: "1",
          userId: "user-1",
          type: "expense",
          amount: 120,
          categoryId: "housing",
          categoryName: "Moradia",
          description: "Internet",
          date: "2026-03-10",
          isRecurring: false,
          isPaid: false,
          createdAt: "2026-03-10",
          updatedAt: "2026-03-10"
        }}
      />
    );

    expect(screen.getByText("trash-outline")).toBeTruthy();
    expect(screen.getByText("create-outline")).toBeTruthy();
    expect(screen.getByText("Moradia")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Marcar Internet como paga"));
    fireEvent.press(screen.getByLabelText("Editar Internet"));
    fireEvent.press(screen.getByLabelText("Excluir Internet"));

    expect(onTogglePaid).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
