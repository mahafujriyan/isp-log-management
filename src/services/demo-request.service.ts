import { db } from "@/lib/database";
import type { DemoRequestInput, DemoRequestRecord } from "@/types/demo-request.types";

export async function createDemoRequest(input: DemoRequestInput): Promise<DemoRequestRecord> {
  const row = await db.getOne<DemoRequestRecord>(
    `INSERT INTO public.demo_requests
      (full_name, email, company, phone, plan_interest, message, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.full_name.trim(),
      input.email.trim().toLowerCase(),
      input.company.trim(),
      (input.phone ?? "").trim(),
      (input.plan_interest ?? "").trim(),
      (input.message ?? "").trim(),
      (input.source ?? "landing").trim(),
    ]
  );

  if (!row) throw new Error("Failed to save demo request");
  return row;
}

export async function listDemoRequests(status?: string): Promise<DemoRequestRecord[]> {
  if (status) {
    return db.getMany<DemoRequestRecord>(
      `SELECT * FROM public.demo_requests WHERE status = $1 ORDER BY created_at DESC`,
      [status]
    );
  }
  return db.getMany<DemoRequestRecord>(
    `SELECT * FROM public.demo_requests ORDER BY created_at DESC`
  );
}

export async function getDemoRequestById(id: number): Promise<DemoRequestRecord | null> {
  return db.getOne<DemoRequestRecord>(
    `SELECT * FROM public.demo_requests WHERE id = $1`,
    [id]
  );
}

export async function updateDemoRequestStatus(
  id: number,
  status: string,
  extra?: Partial<DemoRequestRecord>
): Promise<DemoRequestRecord | null> {
  return db.getOne<DemoRequestRecord>(
    `UPDATE public.demo_requests SET
      status = $2,
      provisioned_user_id = COALESCE($3, provisioned_user_id),
      provisioned_tenant_id = COALESCE($4, provisioned_tenant_id),
      provisioned_at = COALESCE($5, provisioned_at),
      demo_expires_at = COALESCE($6, demo_expires_at),
      duration_minutes = COALESCE($7, duration_minutes)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      status,
      extra?.provisioned_user_id ?? null,
      extra?.provisioned_tenant_id ?? null,
      extra?.provisioned_at ?? null,
      extra?.demo_expires_at ?? null,
      extra?.duration_minutes ?? null,
    ]
  );
}
