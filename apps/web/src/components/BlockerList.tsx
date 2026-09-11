import type { ReadinessBlocker } from "../types";

export function BlockerList({ blockers }: { blockers: ReadinessBlocker[] }) {
  if (blockers.length === 0) {
    return (
      <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
        Sin bloqueos. La etapa puede marcarse lista para ensayo.
      </div>
    );
  }

  return (
    <div className="border border-red-300 bg-red-50">
      <div className="border-b border-red-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-900">
        Motivos de bloqueo ({blockers.length})
      </div>
      <ul className="divide-y divide-red-100">
        {blockers.map((b, i) => (
          <li key={`${b.code}-${i}`} className="flex gap-3 px-3 py-2 text-sm">
            <code className="shrink-0 font-mono text-[11px] font-semibold text-red-800">
              {b.code}
            </code>
            <span className="text-zinc-800">{b.message}</span>
            <span className="ml-auto text-xs text-zinc-500">
              {b.positionCode ?? b.ncrCode ?? b.ecoCode ?? b.partSerial ?? ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
