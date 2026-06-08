import { db } from "@/lib/database";
import type { Plan } from "@/types";

export type CreatePlanInput = {
  name: string;
  price_bdt: number;
  max_users: number;
  max_devices: number;
  retention_days: number;
  max_logs_per_day: number;
  is_featured?: boolean;
};

export type UpdatePlanInput = Partial<CreatePlanInput>;

export async function getPlanById(id: number): Promise<Plan | null> {
  return db.getOne<Plan>("SELECT * FROM public.plans WHERE id = $1", [id]);
}

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  const name = input.name.trim();
  if (!name) throw new Error("Plan name is required");

  if (input.is_featured) {
    await db.query("UPDATE public.plans SET is_featured = FALSE");
  }

  const row = await db.getOne<Plan>(
    `INSERT INTO public.plans
      (name, price_bdt, max_users, max_devices, retention_days, max_logs_per_day, is_featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      name,
      Number(input.price_bdt),
      Number(input.max_users),
      Number(input.max_devices),
      Number(input.retention_days),
      Number(input.max_logs_per_day),
      Boolean(input.is_featured),
    ]
  );

  if (!row) throw new Error("Failed to create plan");
  return row;
}

export async function updatePlan(id: number, input: UpdatePlanInput): Promise<Plan | null> {
  const existing = await getPlanById(id);
  if (!existing) return null;

  if (input.is_featured) {
    await db.query("UPDATE public.plans SET is_featured = FALSE");
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new Error("Plan name is required");

  return db.getOne<Plan>(
    `UPDATE public.plans SET
      name = $1,
      price_bdt = $2,
      max_users = $3,
      max_devices = $4,
      retention_days = $5,
      max_logs_per_day = $6,
      is_featured = $7
     WHERE id = $8
     RETURNING *`,
    [
      name,
      input.price_bdt !== undefined ? Number(input.price_bdt) : existing.price_bdt,
      input.max_users !== undefined ? Number(input.max_users) : existing.max_users,
      input.max_devices !== undefined ? Number(input.max_devices) : existing.max_devices,
      input.retention_days !== undefined ? Number(input.retention_days) : existing.retention_days,
      input.max_logs_per_day !== undefined ? Number(input.max_logs_per_day) : existing.max_logs_per_day,
      input.is_featured !== undefined ? Boolean(input.is_featured) : existing.is_featured ?? false,
      id,
    ]
  );
}

export async function deletePlan(id: number): Promise<boolean> {
  const inUse = await db.getOne<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM public.tenants WHERE plan_id = $1",
    [id]
  );
  if (Number(inUse?.count ?? 0) > 0) {
    throw new Error("Cannot delete a plan assigned to active tenants");
  }

  const result = await db.query("DELETE FROM public.plans WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
