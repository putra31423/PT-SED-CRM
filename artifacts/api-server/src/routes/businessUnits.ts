import { Router } from "express";
import { db, eq, sql, and } from "@workspace/db";
import {
  businessUnitsTable,
  incomeTable,
  expensesTable,
  customersTable,
} from "@workspace/db";
import { CreateBusinessUnitBody } from "@workspace/api-zod";
import { handleRouteError } from "../lib/route-error";

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
    handleRouteError(req, res, err);
  }
});

// POST /business-units
router.post("/business-units", async (req, res) => {
  try {
    const parsed = CreateBusinessUnitBody.safeParse(req.body);
    if (!parsed.success || !parsed.data.name.trim()) {
      res.status(400).json({
        error: "Invalid business unit data",
        code: "VALIDATION_ERROR",
        details: parsed.success
          ? [{ path: ["name"], message: "Name is required" }]
          : parsed.error.issues.map(({ path, message }) => ({ path, message })),
      });
      return;
    }

    const body = parsed.data;
    const name = body.name.trim();
    const slug = (body.slug || name)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      res.status(400).json({ error: "Slug is required", code: "VALIDATION_ERROR" });
      return;
    }

    const [unit] = await db
      .insert(businessUnitsTable)
      .values({
        name,
        slug,
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
    handleRouteError(req, res, err);
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
    if (!unit) {
      res.status(404).json({ error: "Not found" });
      return;
    }

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
    handleRouteError(req, res, err);
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
    if (!unit) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(unit);
  } catch (err) {
    handleRouteError(req, res, err);
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
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

export default router;
