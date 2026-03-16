import { buildRecurringInstallments, isSameRecurringSeries, resolveRecurringEndDate, shouldGenerateRecurringInstance } from "@/utils/recurring";
import { RecurringConfig } from "@/types/finance";

const monthlyConfig: RecurringConfig = {
  frequency: "monthly",
  startDate: "2026-01-10",
  endDate: "2026-03-10"
};

describe("recurring utils", () => {
  it("builds monthly recurring dates without duplicates", () => {
    const installments = buildRecurringInstallments({
        amount: 120,
        categoryId: "housing",
        categoryName: "Moradia",
        description: "Internet",
        config: monthlyConfig,
        existingDates: ["2026-02-10"],
        userId: "user-1"
      });

    expect(installments.map((transaction) => transaction.date)).toEqual(["2026-01-10", "2026-03-10"]);
    expect(installments.every((transaction) => transaction.isPaid === false)).toBe(true);
  });

  it("decides whether a recurring instance should be generated", () => {
    expect(
      shouldGenerateRecurringInstance({
        frequency: "weekly",
        currentDate: "2026-03-10",
        lastGeneratedDate: "2026-03-02"
      })
    ).toBe(true);
  });

  it("covers monthly and yearly recurrence checks", () => {
    expect(
      shouldGenerateRecurringInstance({
        frequency: "monthly",
        currentDate: "2026-03-10",
        lastGeneratedDate: "2026-03-10"
      })
    ).toBe(false);

    expect(
      shouldGenerateRecurringInstance({
        frequency: "yearly",
        currentDate: "2027-01-01",
        lastGeneratedDate: "2026-12-31"
      })
    ).toBe(true);
  });

  it("builds weekly and yearly installments", () => {
    expect(
      buildRecurringInstallments({
        amount: 30,
        categoryId: "health",
        categoryName: "Saúde",
        description: "Consulta",
        config: {
          frequency: "weekly",
          startDate: "2026-03-01",
          endDate: "2026-03-08"
        },
        userId: "user-1"
      }).map((item) => item.date)
    ).toEqual(["2026-03-01", "2026-03-08"]);

    expect(
      buildRecurringInstallments({
        amount: 100,
        categoryId: "education",
        categoryName: "Educação",
        description: "Curso",
        config: {
          frequency: "yearly",
          startDate: "2026-01-01",
          endDate: "2027-01-01"
        },
        userId: "user-1"
      }).map((item) => item.date)
    ).toEqual(["2026-01-01", "2027-01-01"]);
  });

  it("defaults recurring installments to december when no end date is provided", () => {
    const installments = buildRecurringInstallments({
      amount: 120,
      categoryId: "housing",
      categoryName: "Moradia",
      description: "Internet",
      config: {
        frequency: "monthly",
        startDate: "2026-03-10"
      },
      existingDates: ["2026-03-10"],
      parentRecurringId: "root-1",
      userId: "user-1"
    });

    expect(resolveRecurringEndDate("2026-03-10")).toBe("2026-12-31");
    expect(installments.map((transaction) => transaction.date)).toEqual([
      "2026-04-10",
      "2026-05-10",
      "2026-06-10",
      "2026-07-10",
      "2026-08-10",
      "2026-09-10",
      "2026-10-10",
      "2026-11-10",
      "2026-12-10"
    ]);
    expect(installments.every((transaction) => transaction.recurringEndDate === "2026-12-31")).toBe(true);
  });

  it("matches recurring entries from the same future month even without the parent id", () => {
    expect(
      isSameRecurringSeries(
        {
          id: "root-1-2026-04-10",
          userId: "user-1",
          type: "expense",
          amount: 120,
          categoryId: "housing",
          description: "Internet",
          date: "2026-04-10",
          isRecurring: true,
          recurringFrequency: "monthly",
          recurringStartDate: "2026-03-10",
          parentRecurringId: "root-1"
        },
        {
          id: "legacy-dup-2026-04-10",
          userId: "user-1",
          type: "expense",
          amount: 120,
          categoryId: "housing",
          description: "Internet",
          date: "2026-04-10",
          isRecurring: true,
          recurringFrequency: "monthly",
          recurringStartDate: "2026-03-10"
        }
      )
    ).toBe(true);
  });
});
