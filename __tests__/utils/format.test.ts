import { formatCurrency, formatMonthChip, formatMonthYear, formatShortDate, parseCurrencyInput, shiftMonthKey } from "@/utils/format";

describe("format utils", () => {
  it("formats BRL currency", () => {
    expect(formatCurrency(1234.56)).toBe("R$ 1.234,56");
  });

  it("formats short date", () => {
    expect(formatShortDate("2026-03-10")).toBe("10/03");
  });

  it("formats month year", () => {
    expect(formatMonthYear("2026-03-10")).toBe("março de 2026");
  });

  it("formats compact month chips and shifts month keys", () => {
    expect(formatMonthChip("2026-03")).toBe("03/2026");
    expect(shiftMonthKey("2026-03", 2)).toBe("2026-05");
  });

  it("parses currency input", () => {
    expect(parseCurrencyInput("R$ 1.234,56")).toBe(1234.56);
  });

  it("returns zero for invalid currency input", () => {
    expect(parseCurrencyInput("texto")).toBe(0);
  });
});
