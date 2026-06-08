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
};
