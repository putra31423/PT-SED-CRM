import { Router } from "express";
import { db, eq, sql, and } from "@workspace/db";
import {
  businessUnitsTable,
  dealsTable,
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
    // count() over the joined customer id (not *) so a unit with no customers
    // reports 0 rather than 1. One grouped query beats a request per unit.
    const rows = await db
      .select({
        unit: businessUnitsTable,
        totalCustomers: sql<number>`count(${customersTable.id})`,
      })
      .from(businessUnitsTable)
      .leftJoin(customersTable, eq(customersTable.businessUnitId, businessUnitsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(businessUnitsTable.id)
      .orderBy(businessUnitsTable.name);

    res.json(
      rows.map((r) => ({ ...r.unit, totalCustomers: Number(r.totalCustomers) })),
    );
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
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        error: "Invalid business unit ID",
        code: "INVALID_INPUT",
      });
      return;
    }

    const deleted = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: businessUnitsTable.id })
        .from(businessUnitsTable)
        .where(eq(businessUnitsTable.id, id));

      if (!existing) return null;

      // Child records are still valuable CRM and accounting history. Their
      // foreign keys are nullable, so detach them instead of deleting them.
      // Keeping every update and the final delete in one transaction prevents
      // a partial result if any statement fails.
      const updatedAt = new Date();
      await tx
        .update(customersTable)
        .set({ businessUnitId: null, updatedAt })
        .where(eq(customersTable.businessUnitId, id));
      await tx
        .update(dealsTable)
        .set({ businessUnitId: null, updatedAt })
        .where(eq(dealsTable.businessUnitId, id));
      await tx
        .update(incomeTable)
        .set({ businessUnitId: null, updatedAt })
        .where(eq(incomeTable.businessUnitId, id));
      await tx
        .update(expensesTable)
        .set({ businessUnitId: null, updatedAt })
        .where(eq(expensesTable.businessUnitId, id));

      const [removed] = await tx
        .delete(businessUnitsTable)
        .where(eq(businessUnitsTable.id, id))
        .returning({ id: businessUnitsTable.id });

      return removed ?? null;
    });

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
