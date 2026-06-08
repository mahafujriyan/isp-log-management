import { db } from "@/lib/database";
import type { DemoRequestInput, DemoRequestRecord } from "@/types/demo-request.types";

export async function createDemoRequest(input: DemoRequestInput): Promise<DemoRequestRecord> {
  const row = await db.getOne<DemoRequestRecord>(
    `INSERT INTO public.demo_requests
      (full_name, email, company, phone, plan_interest, message, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, full_name, email, company, phone, plan_interest, message, source, status, created_at`,
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
