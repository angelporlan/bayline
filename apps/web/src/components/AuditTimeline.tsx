import { ACTION_LABEL } from "../labels";
import type { AuditEvent } from "../types";

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Sin eventos de auditoría todavía.</p>
    );
  }
  return (
    <ol className="divide-y divide-zinc-200 border border-zinc-200 bg-white">
      {events.map((e) => (
        <li key={e.id} className="grid grid-cols-[160px_1fr_140px] gap-3 px-3 py-2">
          <time className="font-mono text-[11px] text-zinc-500">
            {new Date(e.createdAt).toLocaleString("es-ES")}
          </time>
          <div>
            <div className="text-sm font-medium">
              {ACTION_LABEL[e.action] ?? e.action}
            </div>
            <pre className="mt-1 max-h-24 overflow-auto text-[11px] text-zinc-600">
              {JSON.stringify(e.payload)}
            </pre>
          </div>
          <div className="text-right text-xs text-zinc-500">
            {e.actorName}
            <div className="font-mono">{e.actorRole}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
