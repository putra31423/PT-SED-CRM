import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, businessUnitsTable, dealsTable, incomeTable } from "@workspace/db";
import { eq, sql, and, ilike, or } from "drizzle-orm";

const router = Router();

// GET /customers
router.get("/customers", async (req, res) => {
  try {
    const { status, businessUnitId, search, page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (status && status !== "null") conditions.push(ilike(customersTable.status, `%${status as string}%`));
    if (businessUnitId && businessUnitId !== "null") conditions.push(eq(customersTable.businessUnitId, parseInt(businessUnitId as string)));
    if (search && search !== "null") {
      conditions.push(
        or(
          ilike(customersTable.fullName, `%${search}%`),
          ilike(customersTable.email, `%${search}%`),
          ilike(customersTable.phone, `%${search}%`),
          ilike(customersTable.businessName, `%${search}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customersTable)
      .where(where);

    const rows = await db
      .select({
        customer: customersTable,
        businessUnitName: businessUnitsTable.name,
      })
      .from(customersTable)
      .leftJoin(businessUnitsTable, eq(customersTable.businessUnitId, businessUnitsTable.id))
      .where(where)
      .orderBy(customersTable.createdAt)
      .limit(limitNum)
      .offset(offset);

    const data = rows.map((r) => ({
      ...r.customer,
      businessUnitName: r.businessUnitName ?? null,
    }));

    res.json({ data, total: Number(totalRow?.count ?? 0), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /customers
router.post("/customers", async (req, res) => {
  try {
    const body = req.body;
    // Use MAX of existing customer_id numbers to avoid collision when rows have been deleted
    const [maxRow] = await db
      .select({ maxId: sql<string>`max(customer_id)` })
      .from(customersTable);
    const lastNum = maxRow?.maxId ? parseInt(maxRow.maxId.replace("CUS-", ""), 10) : 0;
    const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
    const customerId = `CUS-${String(nextNum).padStart(4, "0")}`;
    const [customer] = await db
      .insert(customersTable)
      .values({ ...body, customerId })
      .returning();
    res.status(201).json(customer);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /customers/stats/summary
router.get("/customers/stats/summary", async (req, res) => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(customersTable);
    const byStatus = await db.execute<{ status: string; count: string }>(sql`
      SELECT trim(label) AS status, count(*) AS count
      FROM customers, unnest(string_to_array(status, ',')) AS label
      GROUP BY trim(label)
      ORDER BY count DESC
    `);
    res.json({
      total: Number(total?.count ?? 0),
      growth: 12.5,
      byStatus: byStatus.rows.map((r) => ({ status: r.status, count: Number(r.count) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /customers/:id
router.get("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db
      .select({ customer: customersTable, businessUnitName: businessUnitsTable.name })
      .from(customersTable)
      .leftJoin(businessUnitsTable, eq(customersTable.businessUnitId, businessUnitsTable.id))
      .where(eq(customersTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row.customer, businessUnitName: row.businessUnitName ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /customers/:id
router.patch("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db
      .update(customersTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(customersTable.id, id))
      .returning();
    if (!customer) return res.status(404).json({ error: "Not found" });
    res.json(customer);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /customers/:id
router.delete("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Null out FK references to avoid constraint violations
    await db.update(dealsTable).set({ customerId: null }).where(eq(dealsTable.customerId, id));
    await db.update(incomeTable).set({ customerId: null }).where(eq(incomeTable.customerId, id));
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
