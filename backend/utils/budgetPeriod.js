/**
 * Returns the start and end boundaries of the current billing period.
 *
 * @param {number} utcOffset - minutes from getTimezoneOffset() (positive = behind UTC)
 * @param {number} referenceDateMs - timestamp to compute the period for (default: now)
 * @param {number} startDay - day of month the period starts (1–28, default 1)
 */
function getBudgetPeriod(utcOffset, referenceDateMs = Date.now(), startDay = 1) {
  const offsetMs = utcOffset * 60 * 1000;
  const nowLocal = new Date(referenceDateMs - offsetMs);
  const day = nowLocal.getUTCDate();
  const month = nowLocal.getUTCMonth();
  const year = nowLocal.getUTCFullYear();

  let startMonth, startYear, endMonth, endYear;

  if (day < startDay) {
    // Today is before the start day — period began last month
    startMonth = month === 0 ? 11 : month - 1;
    startYear  = month === 0 ? year - 1 : year;
    endMonth   = month;
    endYear    = year;
  } else {
    startMonth = month;
    startYear  = year;
    endMonth   = month === 11 ? 0 : month + 1;
    endYear    = month === 11 ? year + 1 : year;
  }

  const endDay = startDay - 1;
  const periodStart = new Date(Date.UTC(startYear, startMonth, startDay) + offsetMs);
  const periodEnd = endDay === 0
    ? new Date(Date.UTC(endYear, endMonth, 0, 23, 59, 59, 999) + offsetMs)
    : new Date(Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999) + offsetMs);

  return { periodStart, periodEnd };
}

module.exports = { getBudgetPeriod };
