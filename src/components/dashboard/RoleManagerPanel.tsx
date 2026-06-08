"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoleMenuAssignment } from "@/types/menu.types";
import { ALL_ROLES, PERMISSIONS, ROLE_LABELS } from "@/constants/roles.constants";
import type { AppRole, Permission } from "@/constants/roles.constants";
import { hasPermission } from "@/utils/rbac.utils";
import { Tag } from "@/components/shared/Tag";
import { Loader2, PanelLeft } from "lucide-react";

export function RoleManagerPanel({ onOpenMenuManager }: { onOpenMenuManager?: () => void }) {
  const [assignments, setAssignments] = useState<RoleMenuAssignment[]>([]);
  const [selectedRole, setSelectedRole] = useState<AppRole>("super_admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/menus/assignments")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAssignments(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const menusForRole = useMemo(
    () => assignments.filter((a) => a.role === selectedRole).map((a) => a.menu_label),
    [assignments, selectedRole]
  );

  const permissionList = Object.keys(PERMISSIONS) as Permission[];

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-white">
        <Loader2 className="animate-spin text-[#1565C0]" size={24} />
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Roles</div>
        {ALL_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setSelectedRole(role)}
            className={`mb-1 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
              selectedRole === role ? "border-[#1976D2] bg-[#E3F2FD]" : "border-transparent hover:bg-[#F8FAFC]"
            }`}
          >
            <Tag variant={role === "super_admin" ? "sa" : role === "operator" ? "op" : "vw"}>
              {ROLE_LABELS[role]}
            </Tag>
            <span className="text-[11px] text-[#94A3B8]">
              {assignments.filter((a) => a.role === role).length} menus
            </span>
          </button>
        ))}
        {onOpenMenuManager && (
          <button
            type="button"
            onClick={onOpenMenuManager}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] py-2 text-[12px] text-[#1565C0] hover:bg-[#F8FAFC]"
          >
            <PanelLeft size={14} /> Edit menu permissions in Menu Manager
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">
            Sidebar menus — {ROLE_LABELS[selectedRole]}
          </div>
          {menusForRole.length === 0 ? (
            <p className="text-[12px] text-[#94A3B8]">No menus assigned. Use Menu Manager.</p>
          ) : (
            menusForRole.map((menu) => (
              <div key={menu} className="flex items-center justify-between border-b border-[#E2E8F0] py-1.5 text-[12px] last:border-0">
                <span>{menu}</span>
                <Tag variant="ok">Visible</Tag>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">
            API permissions — {ROLE_LABELS[selectedRole]}
          </div>
          {permissionList.map((perm) => {
            const allowed = hasPermission(selectedRole, perm);
            return (
              <div key={perm} className="flex items-center justify-between border-b border-[#E2E8F0] py-1.5 text-[12px] last:border-0">
                <span className="font-mono text-[11px]">{perm.replace(/_/g, " ")}</span>
                <Tag variant={allowed ? "ok" : "off"}>{allowed ? "Allowed" : "Denied"}</Tag>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
