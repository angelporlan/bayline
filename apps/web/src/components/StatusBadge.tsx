import { PART_STATUS, VEHICLE_STATUS } from "../labels";
import type { PartStatus, VehicleStatus } from "../types";

const VEHICLE_CLASS: Record<VehicleStatus, string> = {
  IN_BUILD: "bg-zinc-200 text-zinc-800",
  BLOCKED: "bg-red-100 text-red-900 border border-red-300",
  READY_FOR_TEST: "bg-emerald-100 text-emerald-900 border border-emerald-300",
  IN_TEST: "bg-sky-100 text-sky-900",
  COMPLETE: "bg-emerald-200 text-emerald-950",
};

const PART_CLASS: Record<PartStatus, string> = {
  RECEIVED: "bg-zinc-100 text-zinc-700",
  INSPECTED: "bg-amber-50 text-amber-900 border border-amber-200",
  NDT_OK: "bg-emerald-50 text-emerald-900",
  INSTALLED: "bg-emerald-100 text-emerald-950",
  BLOCKED: "bg-red-100 text-red-900",
  SCRAPPED: "bg-zinc-300 text-zinc-700 line-through",
};

export function StatusBadge({
  status,
  kind = "vehicle",
}: {
  status: VehicleStatus | PartStatus;
  kind?: "vehicle" | "part";
}) {
  const label =
    kind === "part"
      ? PART_STATUS[status as PartStatus]
      : VEHICLE_STATUS[status as VehicleStatus];
  const cls =
    kind === "part"
      ? PART_CLASS[status as PartStatus]
      : VEHICLE_CLASS[status as VehicleStatus];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "BLOCKED"
            ? "bg-red-600"
            : status === "READY_FOR_TEST" ||
                status === "NDT_OK" ||
                status === "INSTALLED" ||
                status === "COMPLETE"
              ? "bg-emerald-600"
              : "bg-amber-500"
        }`}
      />
      {label}
    </span>
  );
}
