import { Router } from "express";
import { db, eq, sql, and, ilike, or } from "@workspace/db";
import { customersTable, businessUnitsTable, dealsTable, incomeTable } from "@workspace/db";
import { CreateCustomerBody } from "@workspace/api-zod";
import { handleRouteError } from "../lib/route-error";

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
    handleRouteError(req, res, err);
  }
});

// POST /customers
router.post("/customers", async (req, res) => {
  try {
    const parsed = CreateCustomerBody.safeParse(req.body);
    if (!parsed.success || !parsed.data.fullName.trim()) {
      res.status(400).json({
        error: "Invalid customer data",
        code: "VALIDATION_ERROR",
        details: parsed.success
          ? [{ path: ["fullName"], message: "Full name is required" }]
          : parsed.error.issues.map(({ path, message }) => ({ path, message })),
      });
      return;
    }

    const body = {
      ...parsed.data,
      fullName: parsed.data.fullName.trim(),
      lastContact: parsed.data.lastContact?.toISOString().slice(0, 10),
      nextFollowUp: parsed.data.nextFollowUp?.toISOString().slice(0, 10),
    };

    // The advisory transaction lock makes human-readable ID generation safe
    // when two serverless instances insert at the same time.
    const customer = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('customers_customer_id'))`);
      const [maxRow] = await tx
        .select({
          maxId: sql<number>`coalesce(max(substring(${customersTable.customerId} from '([0-9]+)$')::integer), 0)`,
        })
        .from(customersTable);
      const nextNum = Number(maxRow?.maxId ?? 0) + 1;
      const customerId = `CUS-${String(nextNum).padStart(4, "0")}`;
      const [created] = await tx
        .insert(customersTable)
        .values({ ...body, customerId })
        .returning();
      return created;
    });

    res.status(201).json(customer);
  } catch (err) {
    handleRouteError(req, res, err);
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
    handleRouteError(req, res, err);
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
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...row.customer, businessUnitName: row.businessUnitName ?? null });
  } catch (err) {
    handleRouteError(req, res, err);
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
    if (!customer) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(customer);
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

// DELETE /customers/:id
router.delete("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.transaction(async (tx) => {
      await tx.update(dealsTable).set({ customerId: null }).where(eq(dealsTable.customerId, id));
      await tx.update(incomeTable).set({ customerId: null }).where(eq(incomeTable.customerId, id));
      const [row] = await tx.delete(customersTable).where(eq(customersTable.id, id)).returning();
      return row;
    });
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    handleRouteError(req, res, err);
  }
});

export default router;
