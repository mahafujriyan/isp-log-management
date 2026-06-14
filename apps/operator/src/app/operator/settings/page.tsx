import { OperatorAccountSettings } from "@isp/features/operator/components/OperatorAccountSettings";

export default function OperatorSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Account Settings</h2>
        <p className="mt-1 text-sm text-white/40">
          Update your company name, logo, contact details, and system preferences.
        </p>
      </div>
      <OperatorAccountSettings />
    </div>
  );
}
