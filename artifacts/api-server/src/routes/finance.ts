import { Router } from "express";
import { db, eq, sql, and, gte, lte, desc } from "@workspace/db";
import { incomeTable, expensesTable, businessUnitsTable, customersTable } from "@workspace/db";
import { getPeriodDates } from "../lib/period";
import { handleRouteError } from "../lib/route-error";

const router = Router();

// ── INCOME ────────────────────────────────────────────────────────────────────

router.get("/finance/income", async (req, res) => {
  try {
    const { businessUnitId, customerId, startDate, endDate, status, page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const conditions: any[] = [];
    if (businessUnitId && businessUnitId !== "null") conditions.push(eq(incomeTable.businessUnitId, parseInt(businessUnitId as string)));
    if (customerId && customerId !== "null") conditions.push(eq(incomeTable.customerId, parseInt(customerId as string)));
    if (startDate && startDate !== "null") conditions.push(gte(incomeTable.date, startDate as string));
    if (endDate && endDate !== "null") conditions.push(lte(incomeTable.date, endDate as string));
    if (status && status !== "null") conditions.push(eq(incomeTable.status, status as string));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db.select({ count: sql<number>`count(*)`, totalAmount: sql<number>`coalesce(sum(amount::numeric),0)` }).from(incomeTable).where(where);
    const rows = await db.select({ income: incomeTable, businessUnitName: businessUnitsTable.name, customerName: customersTable.fullName })
      .from(incomeTable)
      .leftJoin(businessUnitsTable, eq(incomeTable.businessUnitId, businessUnitsTable.id))
      .leftJoin(customersTable, eq(incomeTable.customerId, customersTable.id))
      .where(where).orderBy(desc(incomeTable.date), desc(incomeTable.id)).limit(limitNum).offset(offset);

    res.json({
      data: rows.map((r) => ({ ...r.income, amount: Number(r.income.amount), tax: Number(r.income.tax), businessUnitName: r.businessUnitName ?? null, customerName: r.customerName ?? null })),
      total: Number(totalRow?.count ?? 0),
      page: pageNum,
      limit: limitNum,
      totalAmount: Number(totalRow?.totalAmount ?? 0),
    });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

router.post("/finance/income", async (req, res) => {
  try {
    const [inc] = await db.insert(incomeTable).values(req.body).returning();
    res.status(201).json({ ...inc, amount: Number(inc.amount), tax: Number(inc.tax) });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

router.get("/finance/income/:id", async (req, res) => {
  try {
    const [inc] = await db.select().from(incomeTable).where(eq(incomeTable.id, parseInt(req.params.id)));
    if (!inc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...inc, amount: Number(inc.amount), tax: Number(inc.tax) });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

router.patch("/finance/income/:id", async (req, res) => {
  try {
    const [inc] = await db.update(incomeTable).set({ ...req.body, updatedAt: new Date() }).where(eq(incomeTable.id, parseInt(req.params.id))).returning();
    if (!inc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...inc, amount: Number(inc.amount), tax: Number(inc.tax) });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

router.delete("/finance/income/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(incomeTable).where(eq(incomeTable.id, parseInt(req.params.id))).returning();
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

// ── EXPENSES ──────────────────────────────────────────────────────────────────

router.get("/finance/expenses", async (req, res) => {
  try {
    const { businessUnitId, startDate, endDate, page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const conditions: any[] = [];
    if (businessUnitId && businessUnitId !== "null") conditions.push(eq(expensesTable.businessUnitId, parseInt(businessUnitId as string)));
    if (startDate && startDate !== "null") conditions.push(gte(expensesTable.date, startDate as string));
    if (endDate && endDate !== "null") conditions.push(lte(expensesTable.date, endDate as string));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db.select({ count: sql<number>`count(*)`, totalAmount: sql<number>`coalesce(sum(amount::numeric),0)` }).from(expensesTable).where(where);
    const rows = await db.select({ expense: expensesTable, businessUnitName: businessUnitsTable.name })
      .from(expensesTable)
      .leftJoin(businessUnitsTable, eq(expensesTable.businessUnitId, businessUnitsTable.id))
      .where(where).orderBy(desc(expensesTable.date), desc(expensesTable.id)).limit(limitNum).offset(offset);

    res.json({
      data: rows.map((r) => ({ ...r.expense, amount: Number(r.expense.amount), tax: Number(r.expense.tax), businessUnitName: r.businessUnitName ?? null })),
      total: Number(totalRow?.count ?? 0),
      page: pageNum,
      limit: limitNum,
      totalAmount: Number(totalRow?.totalAmount ?? 0),
    });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

router.post("/finance/expenses", async (req, res) => {
  try {
    const [exp] = await db.insert(expensesTable).values(req.body).returning();
    res.status(201).json({ ...exp, amount: Number(exp.amount), tax: Number(exp.tax) });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

router.get("/finance/expenses/:id", async (req, res) => {
  try {
    const [exp] = await db.select().from(expensesTable).where(eq(expensesTable.id, parseInt(req.params.id)));
    if (!exp) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...exp, amount: Number(exp.amount), tax: Number(exp.tax) });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

router.patch("/finance/expenses/:id", async (req, res) => {
  try {
    const [exp] = await db.update(expensesTable).set({ ...req.body, updatedAt: new Date() }).where(eq(expensesTable.id, parseInt(req.params.id))).returning();
    if (!exp) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...exp, amount: Number(exp.amount), tax: Number(exp.tax) });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

router.delete("/finance/expenses/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(expensesTable).where(eq(expensesTable.id, parseInt(req.params.id))).returning();
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

// ── PROFIT & LOSS ─────────────────────────────────────────────────────────────

router.get("/finance/profit-loss", async (req, res) => {
  try {
    const { period, startDate: sd, endDate: ed, businessUnitId } = req.query;
    const { startDate, endDate } = sd && sd !== "null" && ed && ed !== "null"
      ? { startDate: sd as string, endDate: ed as string }
      : getPeriodDates(period as string || "this_month");

    const incomeConditions: any[] = [];
    const expenseConditions: any[] = [];
    if (startDate) { incomeConditions.push(gte(incomeTable.date, startDate)); expenseConditions.push(gte(expensesTable.date, startDate)); }
    if (endDate) { incomeConditions.push(lte(incomeTable.date, endDate)); expenseConditions.push(lte(expensesTable.date, endDate)); }
    if (businessUnitId && businessUnitId !== "null") {
      incomeConditions.push(eq(incomeTable.businessUnitId, parseInt(businessUnitId as string)));
      expenseConditions.push(eq(expensesTable.businessUnitId, parseInt(businessUnitId as string)));
    }

    const [incAgg] = await db.select({ revenue: sql<number>`coalesce(sum(amount::numeric),0)`, tax: sql<number>`coalesce(sum(tax::numeric),0)` }).from(incomeTable).where(incomeConditions.length > 0 ? and(...incomeConditions) : undefined);
    const [expAgg] = await db.select({ expenses: sql<number>`coalesce(sum(amount::numeric),0)` }).from(expensesTable).where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined);

    const revenue = Number(incAgg?.revenue ?? 0);
    const expenses = Number(expAgg?.expenses ?? 0);
    const tax = Number(incAgg?.tax ?? 0);
    const grossProfit = revenue - expenses;
    const netProfit = grossProfit - tax;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Monthly breakdown for chart
    const monthlyIncome = await db.select({
      month: sql<string>`to_char(${incomeTable.date}::date, 'Mon')`,
      revenue: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)`,
    }).from(incomeTable).where(incomeConditions.length > 0 ? and(...incomeConditions) : undefined).groupBy(sql`to_char(${incomeTable.date}::date, 'Mon'), date_part('month', ${incomeTable.date}::date)`).orderBy(sql`date_part('month', ${incomeTable.date}::date)`);

    const monthlyExpenses = await db.select({
      month: sql<string>`to_char(${expensesTable.date}::date, 'Mon')`,
      expenses: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
    }).from(expensesTable).where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined).groupBy(sql`to_char(${expensesTable.date}::date, 'Mon'), date_part('month', ${expensesTable.date}::date)`).orderBy(sql`date_part('month', ${expensesTable.date}::date)`);

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const breakdown = months.map((m) => {
      const inc = monthlyIncome.find((r) => r.month === m);
      const exp = monthlyExpenses.find((r) => r.month === m);
      const rev = Number(inc?.revenue ?? 0);
      const exp_ = Number(exp?.expenses ?? 0);
      return { label: m, revenue: rev, expenses: exp_, profit: rev - exp_ };
    }).filter((r) => r.revenue > 0 || r.expenses > 0);

    res.json({ period: period || "this_month", revenue, expenses, grossProfit, netProfit, margin, tax, growth: 15.3, breakdown });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

// ── CASHFLOW ──────────────────────────────────────────────────────────────────

router.get("/finance/cashflow-detail", async (req, res) => {
  try {
    const { period = "monthly", businessUnitId } = req.query;

    const incomeConditions: any[] = [];
    const expenseConditions: any[] = [];
    if (businessUnitId && businessUnitId !== "null") {
      incomeConditions.push(eq(incomeTable.businessUnitId, parseInt(businessUnitId as string)));
      expenseConditions.push(eq(expensesTable.businessUnitId, parseInt(businessUnitId as string)));
    }

    const [totalIncome] = await db.select({ sum: sql<number>`coalesce(sum(amount::numeric),0)` }).from(incomeTable).where(incomeConditions.length > 0 ? and(...incomeConditions) : undefined);
    const [totalExpenses] = await db.select({ sum: sql<number>`coalesce(sum(amount::numeric),0)` }).from(expensesTable).where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined);
    const [pending] = await db.select({ sum: sql<number>`coalesce(sum(amount::numeric),0)` }).from(incomeTable).where(eq(incomeTable.status, "Pending"));

    const inflow = Number(totalIncome?.sum ?? 0);
    const outflow = Number(totalExpenses?.sum ?? 0);

    const monthlyIncome = await db.select({
      label: sql<string>`to_char(${incomeTable.date}::date, 'Mon YYYY')`,
      month: sql<number>`date_part('month', ${incomeTable.date}::date)`,
      year: sql<number>`date_part('year', ${incomeTable.date}::date)`,
      inflow: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)`,
    }).from(incomeTable).where(incomeConditions.length > 0 ? and(...incomeConditions) : undefined)
      .groupBy(sql`to_char(${incomeTable.date}::date, 'Mon YYYY'), date_part('month', ${incomeTable.date}::date), date_part('year', ${incomeTable.date}::date)`)
      .orderBy(sql`date_part('year', ${incomeTable.date}::date), date_part('month', ${incomeTable.date}::date)`);

    const monthlyExpensesData = await db.select({
      label: sql<string>`to_char(${expensesTable.date}::date, 'Mon YYYY')`,
      outflow: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
    }).from(expensesTable).where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined)
      .groupBy(sql`to_char(${expensesTable.date}::date, 'Mon YYYY'), date_part('month', ${expensesTable.date}::date), date_part('year', ${expensesTable.date}::date)`)
      .orderBy(sql`date_part('year', ${expensesTable.date}::date), date_part('month', ${expensesTable.date}::date)`);

    const labels = [...new Set([...monthlyIncome.map((r) => r.label), ...monthlyExpensesData.map((r) => r.label)])];
    let runningBalance = 0;
    const series = labels.map((label) => {
      const inc = Number(monthlyIncome.find((r) => r.label === label)?.inflow ?? 0);
      const exp = Number(monthlyExpensesData.find((r) => r.label === label)?.outflow ?? 0);
      runningBalance += inc - exp;
      return { label, inflow: inc, outflow: exp, balance: runningBalance };
    });

    res.json({
      bankBalance: runningBalance,
      totalInflow: inflow,
      totalOutflow: outflow,
      netCashflow: inflow - outflow,
      outstandingInvoices: Number(pending?.sum ?? 0),
      outstandingExpenses: 0,
      forecastNext30Days: (inflow - outflow) * 0.3,
      series,
    });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

export default router;
