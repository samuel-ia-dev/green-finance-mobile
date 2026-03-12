import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

describe("AppErrorBoundary", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("shows a recovery screen instead of leaving the frontend blank", () => {
    const ProblemChild = () => {
      throw new Error("Falha proposital de render");
    };

    const screen = render(
      <AppErrorBoundary>
        <ProblemChild />
      </AppErrorBoundary>
    );

    expect(screen.getByTestId("app-error-boundary")).toBeTruthy();
    expect(screen.getByText("A tela encontrou um erro")).toBeTruthy();
    expect(screen.getByText("Falha proposital de render")).toBeTruthy();
  });

  it("allows retrying the render tree", () => {
    let shouldCrash = true;

    const ProblemChild = () => {
      if (shouldCrash) {
        throw new Error("Falha transitória");
      }

      return <Text>Frontend restaurado</Text>;
    };

    const screen = render(
      <AppErrorBoundary>
        <ProblemChild />
      </AppErrorBoundary>
    );

    shouldCrash = false;
    fireEvent.press(screen.getByText("Tentar novamente"));

    expect(screen.getByText("Frontend restaurado")).toBeTruthy();
  });
});
