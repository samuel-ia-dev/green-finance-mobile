import { buildRecurringInstallments, isSameRecurringSeries, resolveRecurringEndDate, resolveRecurringGenerationHorizon, shouldGenerateRecurringInstance } from "@/utils/recurring";
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

  it("extends open-ended recurring installments into the next year automatically", () => {
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
      referenceDate: new Date("2026-03-15T00:00:00.000Z"),
      userId: "user-1"
    });

    expect(resolveRecurringEndDate("2026-03-10")).toBeUndefined();
    expect(resolveRecurringGenerationHorizon("2026-03-10", undefined, new Date("2026-03-15T00:00:00.000Z"))).toBe("2027-12-31");
    expect(installments[0].date).toBe("2026-04-10");
    expect(installments.at(-1)?.date).toBe("2027-12-10");
    expect(installments.every((transaction) => transaction.recurringEndDate === undefined)).toBe(true);
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
