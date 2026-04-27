const { getBudgetPeriod } = require("../utils/budgetPeriod");

// All tests use utcOffset=0 (UTC) for clarity
const UTC = 0;

function ts(year, month, day, hour = 12) {
  return Date.UTC(year, month - 1, day, hour, 0, 0);
}

describe("getBudgetPeriod", () => {
  describe("startDay=1 (calendar month)", () => {
    test("mid-month returns current month start to last day", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 15), 1);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 3, 1)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 3, 30, 23, 59, 59, 999)));
    });

    test("first day of month is included in current period", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 1), 1);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 3, 1)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 3, 30, 23, 59, 59, 999)));
    });

    test("last day of month is still in current period", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 30), 1);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 3, 1)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 3, 30, 23, 59, 59, 999)));
    });
  });

  describe("startDay=15 (Up Bank mid-month cycle)", () => {
    test("on the 15th, new period starts", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 15), 15);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 3, 15)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 4, 14, 23, 59, 59, 999)));
    });

    test("before the 15th falls in previous period", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 10), 15);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 2, 15)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 3, 14, 23, 59, 59, 999)));
    });

    test("on the 14th (last day of period)", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 14), 15);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 2, 15)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 3, 14, 23, 59, 59, 999)));
    });
  });

  describe("startDay=20", () => {
    test("on the 20th, new period starts", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 20), 20);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 3, 20)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 4, 19, 23, 59, 59, 999)));
    });

    test("on the 19th (end of period)", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 19), 20);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 2, 20)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 3, 19, 23, 59, 59, 999)));
    });
  });

  describe("year boundary handling", () => {
    test("startDay=15, before 15th in January wraps to December of prev year", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 1, 5), 15);
      expect(periodStart).toEqual(new Date(Date.UTC(2024, 11, 15)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 0, 14, 23, 59, 59, 999)));
    });

    test("startDay=1, December returns Dec 1 to Dec 31", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 12, 15), 1);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 11, 1)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999)));
    });

    test("startDay=15, in December wraps endMonth to January next year", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 12, 20), 15);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 11, 15)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2026, 0, 14, 23, 59, 59, 999)));
    });
  });

  describe("startDay=2 (endDay=1, non-zero edge case)", () => {
    test("on the 2nd, new period starts", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 2), 2);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 3, 2)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 4, 1, 23, 59, 59, 999)));
    });

    test("on the 1st (before start day), falls in previous period", () => {
      const { periodStart, periodEnd } = getBudgetPeriod(UTC, ts(2025, 4, 1), 2);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 2, 2)));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 3, 1, 23, 59, 59, 999)));
    });
  });

  describe("non-zero utcOffset", () => {
    test("AEST (UTC+10, offset=-600) adjusts period correctly", () => {
      // In AEST (UTC+10), midnight 15 Apr local = 14 Apr 14:00 UTC
      // utcOffset from getTimezoneOffset() is -600 for AEST
      const aestOffset = -600;
      // Simulate 16 Apr 2025 12:00 AEST = 16 Apr 2025 02:00 UTC
      const refMs = Date.UTC(2025, 3, 16, 2, 0, 0);
      const { periodStart, periodEnd } = getBudgetPeriod(aestOffset, refMs, 15);
      expect(periodStart).toEqual(new Date(Date.UTC(2025, 3, 15) + aestOffset * 60 * 1000));
      expect(periodEnd).toEqual(new Date(Date.UTC(2025, 4, 14, 23, 59, 59, 999) + aestOffset * 60 * 1000));
    });
  });
});
