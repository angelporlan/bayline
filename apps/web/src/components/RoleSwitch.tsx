import { useRole } from "../role";
import { ROLE_LABEL } from "../labels";
import type { DemoRole } from "../types";

const ROLES: DemoRole[] = ["operator", "quality", "engineering"];

export function RoleSwitch() {
  const { role, setRole } = useRole();
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-zinc-500">Rol</span>
      <select
        className="rounded border border-zinc-300 bg-white px-2 py-1 font-medium"
        value={role}
        onChange={(e) => setRole(e.target.value as DemoRole)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
