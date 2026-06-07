/** BTRC-compliant NAT log record (Bangladesh ISP standard fields) */
export interface BtrcNatRecord {
  isp_license_number: string;
  isp_name: string;
  log_datetime: string;
  subscriber_username: string;
  subscriber_mac: string;
  private_ip: string;
  public_ip: string;
  public_port: number;
  destination_ip: string;
  destination_port: number;
  protocol: string;
  session_id: string;
}

export interface BtrcConfig {
  id?: number;
  isp_license: string;
  isp_name: string;
  api_url: string;
  auto_submit: boolean;
  submit_interval_hours: number;
  retention_days: number;
  timezone: string;
  contact_email: string;
  last_submission_at?: string | null;
}

export interface BtrcSubmission {
  id: number;
  batch_id: string;
  record_count: number;
  period_from: string;
  period_to: string;
  status: "pending" | "success" | "failed" | "simulated";
  response_code?: number | null;
  response_message?: string | null;
  file_hash?: string | null;
  submitted_at: string;
  submitted_by?: string | null;
}

export interface BtrcComplianceStatus {
  compliant: boolean;
  retention_days: number;
  retention_required: number;
  logs_ready: number;
  logs_pending_export: number;
  last_submission: string | null;
  last_submission_status: string | null;
  next_auto_submit: string | null;
  auto_submit_enabled: boolean;
}

export interface BtrcSubmitResult {
  success: boolean;
  simulated: boolean;
  statusCode: number;
  message: string;
  batchId: string;
  recordCount: number;
}
