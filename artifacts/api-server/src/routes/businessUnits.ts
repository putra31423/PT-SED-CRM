import { Router } from "express";
import { db } from "@workspace/db";
import {
  businessUnitsTable,
  incomeTable,
  expensesTable,
  customersTable,
} from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

// GET /business-units
router.get("/business-units", async (req, res) => {
  try {
    const { category } = req.query;
    const conditions = [];
    if (category && category !== "null") {
      conditions.push(eq(businessUnitsTable.category, category as string));
    }
    const units = await db
      .select()
      .from(businessUnitsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(businessUnitsTable.name);
    res.json(units);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /business-units
router.post("/business-units", async (req, res) => {
  try {
    const body = req.body;
    const [unit] = await db
      .insert(businessUnitsTable)
      .values({
        name: body.name,
        slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "-"),
        category: body.category,
        website: body.website || null,
        logoUrl: body.logoUrl || null,
        description: body.description || null,
        notes: body.notes || null,
        isActive: body.isActive ?? true,
      })
      .returning();
    res.status(201).json(unit);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /business-units/:id
router.get("/business-units/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [unit] = await db
      .select()
      .from(businessUnitsTable)
      .where(eq(businessUnitsTable.id, id));
    if (!unit) return res.status(404).json({ error: "Not found" });

    // Aggregate stats
    const [incomeAgg] = await db
      .select({
        totalRevenue: sql<number>`coalesce(sum(${incomeTable.amount}::numeric), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(incomeTable)
      .where(and(eq(incomeTable.businessUnitId, id)));

    const [expenseAgg] = await db
      .select({
        totalExpenses: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
      })
      .from(expensesTable)
      .where(eq(expensesTable.businessUnitId, id));

    const [customerAgg] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customersTable)
      .where(eq(customersTable.businessUnitId, id));

    const totalRevenue = Number(incomeAgg?.totalRevenue ?? 0);
    const totalExpenses = Number(expenseAgg?.totalExpenses ?? 0);

    res.json({
      ...unit,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      totalCustomers: Number(customerAgg?.count ?? 0),
      totalProjects: 0,
      totalInvoices: Number(incomeAgg?.count ?? 0),
      totalStaff: 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /business-units/:id
router.patch("/business-units/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [unit] = await db
      .update(businessUnitsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(businessUnitsTable.id, id))
      .returning();
    if (!unit) return res.status(404).json({ error: "Not found" });
    res.json(unit);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /business-units/:id
router.delete("/business-units/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db
      .delete(businessUnitsTable)
      .where(eq(businessUnitsTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
