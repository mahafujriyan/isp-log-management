-- Cross-tenant NAT log archive (BTRC batch export source)

CREATE TABLE IF NOT EXISTS public.nat_logs (
  id BIGSERIAL PRIMARY KEY,
  log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pppoe_user VARCHAR(256) NOT NULL,
  mac_address VARCHAR(32) NOT NULL,
  private_ip INET NOT NULL,
  public_ip INET NOT NULL,
  public_port INT NOT NULL,
  dest_ip INET NOT NULL,
  dest_port INT NOT NULL,
  protocol VARCHAR(16) NOT NULL DEFAULT 'TCP',
  device_name VARCHAR(128),
  btrc_exported BOOLEAN NOT NULL DEFAULT FALSE,
  btrc_batch_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nat_logs_time ON public.nat_logs (log_time DESC);
CREATE INDEX IF NOT EXISTS idx_nat_logs_btrc ON public.nat_logs (btrc_exported, log_time);
