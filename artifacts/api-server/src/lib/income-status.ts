import { eq } from "@workspace/db";
import { incomeTable } from "@workspace/db";

/**
 * Revenue recognition: only money actually received counts as revenue or cash in.
 *
 * `income.status` is one of Pending / Received / Cancelled. A Pending invoice is
 * money we expect but do not hold yet — it belongs in Outstanding Invoices, not
 * in revenue or cash inflow, otherwise the same rupiah is counted twice and the
 * bank balance reads high. Cancelled income never arrives at all.
 *
 * Apply this to every revenue / profit / cashflow aggregate over `income`.
 *
 * Deliberately NOT applied to:
 *   - the Outstanding Invoices figures, which select `status = 'Pending'`;
 *   - the income list endpoint, which honours the caller's own `?status=` filter
 *     and must still be able to show Pending and Cancelled rows.
 */
export const incomeIsReceived = () => eq(incomeTable.status, "Received");
