import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { exportService } from "@/services/exportService";
import { Transaction } from "@/types/finance";

const transactions: Transaction[] = [
  {
    id: "1",
    userId: "user-1",
    type: "expense",
    amount: 120,
    categoryId: "housing",
    categoryName: "Moradia",
    description: "Internet",
    date: "2026-03-10",
    isRecurring: true,
    recurringFrequency: "monthly",
    recurringStartDate: "2026-01-10",
    parentRecurringId: "rec-1",
    createdAt: "2026-03-10",
    updatedAt: "2026-03-10"
  }
];

const otherMonthTransaction: Transaction = {
  ...transactions[0],
  id: "2",
  description: "Academia",
  date: "2026-04-10",
  createdAt: "2026-04-10",
  updatedAt: "2026-04-10"
};

describe("exportService", () => {
  const originalWindow = global.window;
  const originalDocument = global.document;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, "window", {
      configurable: true,
      value: originalWindow
    });
    Object.defineProperty(global, "document", {
      configurable: true,
      value: originalDocument
    });
  });

  it("exports csv and shares the file", async () => {
    const uri = await exportService.exportCsv([...transactions, otherMonthTransaction], "2026-03");

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining("transactions-2026-03.csv"),
      expect.stringContaining("2026-03-10"),
      expect.anything()
    );
    expect((FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1]).not.toContain("2026-04-10");
    expect(Sharing.shareAsync).toHaveBeenCalled();
    expect(uri).toContain("transactions-2026-03.csv");
  });

  it("exports pdf and shares the file", async () => {
    const uri = await exportService.exportPdf([...transactions, otherMonthTransaction], "2026-03");

    expect(Print.printToFileAsync).toHaveBeenCalledWith({
      html: expect.stringContaining("Relatório financeiro 2026-03")
    });
    expect((Print.printToFileAsync as jest.Mock).mock.calls[0][0].html).toContain("Internet");
    expect((Print.printToFileAsync as jest.Mock).mock.calls[0][0].html).not.toContain("Academia");
    expect(Sharing.shareAsync).toHaveBeenCalled();
    expect(uri).toContain(".pdf");
  });

  it("skips sharing when the device does not support it", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);

    const uri = await exportService.exportCsv(
      [
        ...transactions,
        {
          ...transactions[0],
          id: "2",
          isRecurring: false,
          description: "Supermercado"
        }
      ],
      "2026-04"
    );

    expect(uri).toContain("transactions-2026-04.csv");
  });

  it("exports pdf for non recurring items too", async () => {
    const uri = await exportService.exportPdf(
      [
        {
          ...transactions[0],
          id: "3",
          isRecurring: false,
          description: "Padaria"
        }
      ],
      "2026-05"
    );

    expect(uri).toContain(".pdf");
  });

  it("on web downloads the csv instead of using native file sharing", async () => {
    const appendChild = jest.fn();
    const remove = jest.fn();
    const click = jest.fn();
    const createObjectURL = jest.fn(() => "blob:transactions");
    const revokeObjectURL = jest.fn();
    const link = {
      click,
      download: "",
      href: "",
      remove,
      style: {}
    };

    Object.defineProperty(global, "window", {
      configurable: true,
      value: {
        URL: {
          createObjectURL,
          revokeObjectURL
        },
        setTimeout: (callback: () => void) => {
          callback();
          return 0;
        }
      }
    });

    Object.defineProperty(global, "document", {
      configurable: true,
      value: {
        body: {
          appendChild
        },
        createElement: jest.fn(() => link)
      }
    });

    const uri = await exportService.exportCsv([...transactions, otherMonthTransaction], "2026-03");
    expect(createObjectURL).toHaveBeenCalled();
    const firstCreateObjectUrlCall = createObjectURL.mock.calls.at(0) as unknown[] | undefined;
    const blob = firstCreateObjectUrlCall?.[0] as Blob;
    const csv = await blob.text();

    expect(uri).toBe("transactions-2026-03.csv");
    expect(csv).toContain("2026-03-10");
    expect(csv).not.toContain("2026-04-10");
    expect(click).toHaveBeenCalled();
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it("on web opens a printable financial report instead of printing the current app screen", async () => {
    const focus = jest.fn();
    const print = jest.fn();
    const write = jest.fn();
    const appendChild = jest.fn();
    const remove = jest.fn();
    const iframe = {
      style: {},
      remove,
      contentWindow: {
        document: {
          open: jest.fn(),
          write,
          close: jest.fn()
        },
        focus,
        print
      }
    };

    Object.defineProperty(global, "window", {
      configurable: true,
      value: {
        setTimeout: (callback: () => void) => {
          callback();
          return 0;
        }
      }
    });
    Object.defineProperty(global, "document", {
      configurable: true,
      value: {
        body: {
          appendChild
        },
        createElement: jest.fn(() => iframe)
      }
    });

    const uri = await exportService.exportPdf([...transactions, otherMonthTransaction], "2026-03");

    expect(uri).toBe("web-print://transactions-2026-03.pdf");
    expect(appendChild).toHaveBeenCalledWith(iframe);
    expect(write).toHaveBeenCalledWith(expect.stringContaining("Relatório financeiro 2026-03"));
    expect(write).toHaveBeenCalledWith(expect.stringContaining("Internet"));
    expect(write).not.toHaveBeenCalledWith(expect.stringContaining("Academia"));
    expect(Print.printToFileAsync).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    expect(print).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });
});
