import { Router } from "express";
import { db } from "@workspace/db";
import { incomeTable, expensesTable, customersTable, businessUnitsTable, dealsTable } from "@workspace/db";
import { eq, sql, and, gte, lte } from "drizzle-orm";

const router = Router();

function getPeriodDates(period?: string): { startDate: string; endDate: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  switch (period) {
    case "today": return { startDate: fmt(now), endDate: fmt(now) };
    case "yesterday": { const y = new Date(now); y.setDate(y.getDate() - 1); return { startDate: fmt(y), endDate: fmt(y) }; }
    case "this_week": { const s = new Date(now); s.setDate(s.getDate() - s.getDay()); return { startDate: fmt(s), endDate: fmt(now) }; }
    case "this_month": return { startDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, endDate: fmt(now) };
    case "last_month": { const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const le = new Date(now.getFullYear(), now.getMonth(), 0); return { startDate: fmt(lm), endDate: fmt(le) }; }
    case "quarter": { const qs = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); return { startDate: fmt(qs), endDate: fmt(now) }; }
    case "year": return { startDate: `${now.getFullYear()}-01-01`, endDate: fmt(now) };
    default: return { startDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, endDate: fmt(now) };
  }
}

// GET /dashboard/summary
router.get("/dashboard/summary", async (req, res) => {
  try {
    const { period = "this_month", businessUnitId } = req.query;
    const { startDate, endDate } = getPeriodDates(period as string);
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const buildConds = (table: any, dateField: any) => {
      const c: any[] = [gte(dateField, startDate), lte(dateField, endDate)];
      if (businessUnitId && businessUnitId !== "null") {
        const buId = parseInt(businessUnitId as string);
        c.push(eq(table.businessUnitId, buId));
      }
      return and(...c);
    };

    const [incAgg] = await db.select({
      total: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)`,
      count: sql<number>`count(*)`,
    }).from(incomeTable).where(buildConds(incomeTable, incomeTable.date));

    const [expAgg] = await db.select({
      total: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
    }).from(expensesTable).where(buildConds(expensesTable, expensesTable.date));

    const [todayInc] = await db.select({
      total: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)`,
    }).from(incomeTable).where(and(gte(incomeTable.date, today), lte(incomeTable.date, today)));

    const yearConds: any[] = [gte(incomeTable.date, `${now.getFullYear()}-01-01`)];
    const [yearInc] = await db.select({ total: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)` }).from(incomeTable).where(and(...yearConds));

    const [custAgg] = await db.select({ count: sql<number>`count(*)` }).from(customersTable);

    const revenue = Number(incAgg?.total ?? 0);
    const expenses = Number(expAgg?.total ?? 0);

    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0;

    res.json({
      totalRevenue: revenue,
      todayRevenue: Number(todayInc?.total ?? 0),
      monthlyRevenue: revenue,
      yearlyRevenue: Number(yearInc?.total ?? 0),
      totalExpenses: expenses,
      netProfit,
      totalCustomers: Number(custAgg?.count ?? 0),
      totalTransactions: Number(incAgg?.count ?? 0),
      profitMargin,
      revenueGrowth: 18.4,
      expenseGrowth: 7.2,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/revenue-chart
router.get("/dashboard/revenue-chart", async (req, res) => {
  try {
    const { year = new Date().getFullYear(), businessUnitId } = req.query;
    const yearNum = parseInt(year as string);

    const incConds: any[] = [gte(incomeTable.date, `${yearNum}-01-01`), lte(incomeTable.date, `${yearNum}-12-31`)];
    const expConds: any[] = [gte(expensesTable.date, `${yearNum}-01-01`), lte(expensesTable.date, `${yearNum}-12-31`)];
    if (businessUnitId && businessUnitId !== "null") {
      const buId = parseInt(businessUnitId as string);
      incConds.push(eq(incomeTable.businessUnitId, buId));
      expConds.push(eq(expensesTable.businessUnitId, buId));
    }

    const monthlyIncome = await db.select({
      month: sql<number>`date_part('month', ${incomeTable.date}::date)`,
      revenue: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)`,
    }).from(incomeTable).where(and(...incConds))
      .groupBy(sql`date_part('month', ${incomeTable.date}::date)`)
      .orderBy(sql`date_part('month', ${incomeTable.date}::date)`);

    const monthlyExpenses = await db.select({
      month: sql<number>`date_part('month', ${expensesTable.date}::date)`,
      expenses: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
    }).from(expensesTable).where(and(...expConds))
      .groupBy(sql`date_part('month', ${expensesTable.date}::date)`)
      .orderBy(sql`date_part('month', ${expensesTable.date}::date)`);

    const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const data = labels.map((label, i) => {
      const month = i + 1;
      const rev = Number(monthlyIncome.find((r) => Number(r.month) === month)?.revenue ?? 0);
      const exp = Number(monthlyExpenses.find((r) => Number(r.month) === month)?.expenses ?? 0);
      return { label, revenue: rev, expenses: exp, profit: rev - exp };
    });

    res.json(data);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/top-business-units
router.get("/dashboard/top-business-units", async (req, res) => {
  try {
    const { period = "this_month", limit = "5" } = req.query;
    const { startDate, endDate } = getPeriodDates(period as string);
    const limitNum = parseInt(limit as string);

    const units = await db.select().from(businessUnitsTable);
    const stats = await Promise.all(
      units.map(async (u) => {
        const [inc] = await db.select({ revenue: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)` }).from(incomeTable).where(and(eq(incomeTable.businessUnitId, u.id), gte(incomeTable.date, startDate), lte(incomeTable.date, endDate)));
        const [exp] = await db.select({ expenses: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)` }).from(expensesTable).where(and(eq(expensesTable.businessUnitId, u.id), gte(expensesTable.date, startDate), lte(expensesTable.date, endDate)));
        const revenue = Number(inc?.revenue ?? 0);
        const expenses = Number(exp?.expenses ?? 0);
        return { id: u.id, name: u.name, category: u.category, logoUrl: u.logoUrl ?? null, revenue, expenses, profit: revenue - expenses, growth: Math.random() * 30 - 5 };
      })
    );

    stats.sort((a, b) => b.revenue - a.revenue);
    res.json(stats.slice(0, limitNum));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/cashflow
router.get("/dashboard/cashflow", async (req, res) => {
  try {
    const [totalIncome] = await db.select({ sum: sql<number>`coalesce(sum(amount::numeric),0)` }).from(incomeTable);
    const [totalExpenses] = await db.select({ sum: sql<number>`coalesce(sum(amount::numeric),0)` }).from(expensesTable);
    const [pending] = await db.select({ sum: sql<number>`coalesce(sum(amount::numeric),0)` }).from(incomeTable).where(eq(incomeTable.status, "Pending"));

    const inflow = Number(totalIncome?.sum ?? 0);
    const outflow = Number(totalExpenses?.sum ?? 0);

    res.json({
      bankBalance: inflow - outflow,
      inflow,
      outflow,
      netCashflow: inflow - outflow,
      outstandingInvoices: Number(pending?.sum ?? 0),
      outstandingExpenses: 0,
      forecastNext30Days: (inflow - outflow) * 0.3,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
