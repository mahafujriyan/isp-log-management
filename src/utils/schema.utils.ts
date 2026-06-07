/** Valid PostgreSQL schema name for tenant isolation */
const TENANT_SCHEMA_PATTERN = /^tenant_[a-z0-9_]+$/;

export function isValidTenantSchemaName(name: string): boolean {
  return TENANT_SCHEMA_PATTERN.test(name);
}

/** Throws if schema name is invalid — prevents SQL injection in dynamic queries */
export function assertValidTenantSchema(name: string): string {
  const trimmed = name.trim().toLowerCase();
  if (!isValidTenantSchemaName(trimmed)) {
    throw new Error(`Invalid tenant schema name: ${name}`);
  }
  return trimmed;
}

export function buildTenantSchemaName(tenantId: number): string {
  return `tenant_${String(tenantId).padStart(3, "0")}`;
}
