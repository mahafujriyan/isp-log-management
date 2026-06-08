export type DemoRequestInput = {
  full_name: string;
  email: string;
  company: string;
  phone?: string;
  plan_interest?: string;
  message?: string;
  source?: string;
};

export type DemoRequestRecord = DemoRequestInput & {
  id: number;
  status: string;
  created_at: string;
  provisioned_user_id?: number | null;
  provisioned_tenant_id?: number | null;
  provisioned_at?: string | null;
  demo_expires_at?: string | null;
  duration_minutes?: number | null;
};

export type ProvisionDemoInput = {
  request_id: number;
  password: string;
  duration_value: number;
  duration_unit: "minutes" | "hours";
};

export type ProvisionDemoResult = {
  request: DemoRequestRecord;
  user_id: number;
  email: string;
  username: string;
  tenant_id: number;
  schema_name: string;
  demo_expires_at: string;
  login_url: string;
};
