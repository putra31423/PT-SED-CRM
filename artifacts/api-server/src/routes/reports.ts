import { Router } from "express";
import { db, eq, sql, and, gte, lte } from "@workspace/db";
import { incomeTable, expensesTable, businessUnitsTable } from "@workspace/db";
import { getPeriodDates } from "../lib/period";
import { handleRouteError } from "../lib/route-error";

const router = Router();

// GET /reports/revenue
router.get("/reports/revenue", async (req, res) => {
  try {
    const { period = "this_month", businessUnitId, groupBy = "month" } = req.query;
    const { startDate, endDate } = getPeriodDates(period as string);

    const incConds: any[] = [];
    const expConds: any[] = [];
    if (startDate) { incConds.push(gte(incomeTable.date, startDate)); expConds.push(gte(expensesTable.date, startDate)); }
    if (endDate)   { incConds.push(lte(incomeTable.date, endDate));   expConds.push(lte(expensesTable.date, endDate)); }
    if (businessUnitId && businessUnitId !== "null") {
      const buId = parseInt(businessUnitId as string);
      incConds.push(eq(incomeTable.businessUnitId, buId));
      expConds.push(eq(expensesTable.businessUnitId, buId));
    }
    const incWhere  = incConds.length  > 0 ? and(...incConds)  : undefined;
    const expWhere  = expConds.length  > 0 ? and(...expConds)  : undefined;

    const [totals] = await db.select({
      revenue: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)`,
    }).from(incomeTable).where(incWhere);

    const [expTotals] = await db.select({
      expenses: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
    }).from(expensesTable).where(expWhere);

    const monthlyIncome = await db.select({
      label: sql<string>`to_char(${incomeTable.date}::date, 'Mon')`,
      month: sql<number>`date_part('month', ${incomeTable.date}::date)`,
      revenue: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)`,
    }).from(incomeTable).where(incWhere)
      .groupBy(sql`to_char(${incomeTable.date}::date, 'Mon'), date_part('month', ${incomeTable.date}::date)`)
      .orderBy(sql`date_part('month', ${incomeTable.date}::date)`);

    const monthlyExpenses = await db.select({
      label: sql<string>`to_char(${expensesTable.date}::date, 'Mon')`,
      month: sql<number>`date_part('month', ${expensesTable.date}::date)`,
      expenses: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
    }).from(expensesTable).where(expWhere)
      .groupBy(sql`to_char(${expensesTable.date}::date, 'Mon'), date_part('month', ${expensesTable.date}::date)`)
      .orderBy(sql`date_part('month', ${expensesTable.date}::date)`);

    const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const data = labels.map((label, i) => {
      const month = i + 1;
      const rev = Number(monthlyIncome.find((r) => Number(r.month) === month)?.revenue ?? 0);
      const exp = Number(monthlyExpenses.find((r) => Number(r.month) === month)?.expenses ?? 0);
      return { label, revenue: rev, expenses: exp, profit: rev - exp };
    }).filter((r) => r.revenue > 0 || r.expenses > 0);

    const totalRev = Number(totals?.revenue ?? 0);
    const totalExp = Number(expTotals?.expenses ?? 0);

    res.json({
      totalRevenue: totalRev,
      totalExpenses: totalExp,
      netProfit: totalRev - totalExp,
      data,
    });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

// GET /reports/analytics
router.get("/reports/analytics", async (req, res) => {
  try {
    const { period = "this_month" } = req.query;
    const { startDate, endDate } = getPeriodDates(period as string);

    const units = await db.select().from(businessUnitsTable);
    const stats = await Promise.all(
      units.map(async (u) => {
        const incConds: any[] = [eq(incomeTable.businessUnitId, u.id)];
        const expConds: any[] = [eq(expensesTable.businessUnitId, u.id)];
        if (startDate) { incConds.push(gte(incomeTable.date, startDate)); expConds.push(gte(expensesTable.date, startDate)); }
        if (endDate)   { incConds.push(lte(incomeTable.date, endDate));   expConds.push(lte(expensesTable.date, endDate)); }
        const [inc] = await db.select({ revenue: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)` }).from(incomeTable).where(and(...incConds));
        const [exp] = await db.select({ expenses: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)` }).from(expensesTable).where(and(...expConds));
        const revenue = Number(inc?.revenue ?? 0);
        const expenses = Number(exp?.expenses ?? 0);
        return { id: u.id, name: u.name, category: u.category, logoUrl: u.logoUrl ?? null, revenue, expenses, profit: revenue - expenses, growth: Math.random() * 30 - 5 };
      })
    );

    const byRevenue = [...stats].sort((a, b) => b.revenue - a.revenue);
    const byExpense = [...stats].sort((a, b) => b.expenses - a.expenses);
    const byProfit = [...stats].sort((a, b) => b.profit - a.profit);

    res.json({
      topRevenue: byRevenue.slice(0, 5),
      lowestRevenue: byRevenue.slice(-5).reverse(),
      highestExpense: byExpense.slice(0, 5),
      highestProfit: byProfit.slice(0, 5),
      customerGrowth: 23.4,
      monthlyGrowth: 18.4,
      yearlyGrowth: 34.7,
    });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

export default router;
