import { Router } from "express";
import { db, eq, sql, and } from "@workspace/db";
import { dealsTable, customersTable, businessUnitsTable } from "@workspace/db";

const router = Router();

// GET /sales/deals
router.get("/sales/deals", async (req, res) => {
  try {
    const { stage, businessUnitId, assignedStaff } = req.query;
    const conditions: any[] = [];
    if (stage && stage !== "null") conditions.push(eq(dealsTable.stage, stage as string));
    if (businessUnitId && businessUnitId !== "null") conditions.push(eq(dealsTable.businessUnitId, parseInt(businessUnitId as string)));
    if (assignedStaff && assignedStaff !== "null") conditions.push(eq(dealsTable.assignedStaff, assignedStaff as string));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db
      .select({
        deal: dealsTable,
        customerName: customersTable.fullName,
        businessUnitName: businessUnitsTable.name,
      })
      .from(dealsTable)
      .leftJoin(customersTable, eq(dealsTable.customerId, customersTable.id))
      .leftJoin(businessUnitsTable, eq(dealsTable.businessUnitId, businessUnitsTable.id))
      .where(where)
      .orderBy(dealsTable.createdAt);

    const data = rows.map((r) => ({
      ...r.deal,
      value: Number(r.deal.value),
      customerName: r.customerName ?? null,
      businessUnitName: r.businessUnitName ?? null,
    }));
    res.json(data);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /sales/deals
router.post("/sales/deals", async (req, res) => {
  try {
    const body = req.body;
    const [deal] = await db.insert(dealsTable).values({ ...body }).returning();
    res.status(201).json({ ...deal, value: Number(deal.value) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /sales/pipeline-summary
router.get("/sales/pipeline-summary", async (req, res) => {
  try {
    const byStage = await db
      .select({
        stage: dealsTable.stage,
        count: sql<number>`count(*)`,
        value: sql<number>`coalesce(sum(${dealsTable.value}::numeric), 0)`,
      })
      .from(dealsTable)
      .groupBy(dealsTable.stage);

    const [totals] = await db
      .select({
        total: sql<number>`count(*)`,
        totalValue: sql<number>`coalesce(sum(${dealsTable.value}::numeric), 0)`,
      })
      .from(dealsTable);

    const wonStage = byStage.find((b) => b.stage === "Won");

    res.json({
      totalValue: Number(totals?.totalValue ?? 0),
      totalDeals: Number(totals?.total ?? 0),
      wonValue: Number(wonStage?.value ?? 0),
      wonDeals: Number(wonStage?.count ?? 0),
      byStage: byStage.map((s) => ({
        stage: s.stage,
        count: Number(s.count),
        value: Number(s.value),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /sales/deals/:id
router.get("/sales/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db
      .select({ deal: dealsTable, customerName: customersTable.fullName, businessUnitName: businessUnitsTable.name })
      .from(dealsTable)
      .leftJoin(customersTable, eq(dealsTable.customerId, customersTable.id))
      .leftJoin(businessUnitsTable, eq(dealsTable.businessUnitId, businessUnitsTable.id))
      .where(eq(dealsTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...row.deal, value: Number(row.deal.value), customerName: row.customerName ?? null, businessUnitName: row.businessUnitName ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /sales/deals/:id
router.patch("/sales/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deal] = await db
      .update(dealsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(dealsTable.id, id))
      .returning();
    if (!deal) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...deal, value: Number(deal.value) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /sales/deals/:id
router.delete("/sales/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(dealsTable).where(eq(dealsTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
