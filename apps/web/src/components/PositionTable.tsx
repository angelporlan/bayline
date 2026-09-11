import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useRole } from "../role";
import type { PartSummary, PositionRow } from "../types";
import { StatusBadge } from "./StatusBadge";

export function PositionTable({
  positions,
  availableParts,
  onChanged,
  onError,
}: {
  positions: PositionRow[];
  availableParts: PartSummary[];
  onChanged: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const { role } = useRole();
  const canInstall = role === "operator" || role === "quality";

  return (
    <div className="overflow-x-auto border border-zinc-300 bg-white">
      <table className="w-full text-left text-xs">
        <thead className="bg-zinc-100 text-[11px] uppercase tracking-wide text-zinc-600">
          <tr>
            <th className="px-3 py-2 font-semibold">Posición</th>
            <th className="px-3 py-2 font-semibold">PN req.</th>
            <th className="px-3 py-2 font-semibold">Rev req.</th>
            <th className="px-3 py-2 font-semibold">S/N</th>
            <th className="px-3 py-2 font-semibold">Estado</th>
            <th className="px-3 py-2 font-semibold">Flags</th>
            <th className="px-3 py-2 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {positions.map((p) => (
            <PositionRowView
              key={p.id}
              position={p}
              availableParts={availableParts}
              canInstall={canInstall}
              onChanged={onChanged}
              onError={onError}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PositionRowView({
  position,
  availableParts,
  canInstall,
  onChanged,
  onError,
}: {
  position: PositionRow;
  availableParts: PartSummary[];
  canInstall: boolean;
  onChanged: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const part = position.installedPart;
  const candidates = availableParts.filter(
    (p) =>
      p.pn === position.requiredPn &&
      p.revision === position.requiredRevision &&
      p.status === "NDT_OK",
  );
  const [partId, setPartId] = useState(candidates[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const certOk = Boolean(
    part?.certificates.some((c) => c.type === "NDT" || c.type === "COC"),
  );
  const ncrOpen = Boolean(
    part?.ncrs?.some((n) => n.status === "OPEN" || n.status === "CONTAINED"),
  );
  const revMismatch = Boolean(
    part && part.revision !== position.requiredRevision,
  );

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className={!part ? "bg-red-50/60" : undefined}>
      <td className="px-3 py-2">
        <div className="font-mono font-medium">{position.code}</div>
        <div className="text-zinc-500">{position.title}</div>
      </td>
      <td className="px-3 py-2 font-mono">{position.requiredPn}</td>
      <td className="px-3 py-2 font-mono">{position.requiredRevision}</td>
      <td className="px-3 py-2">
        {part ? (
          <Link className="font-mono text-zinc-900 underline" to={`/parts/${part.id}`}>
            {part.serial}
          </Link>
        ) : (
          <span className="font-medium text-red-800">VACÍA</span>
        )}
      </td>
      <td className="px-3 py-2">
        {part ? <StatusBadge kind="part" status={part.status} /> : "—"}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {position.critical && (
            <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold">
              CRÍTICA
            </span>
          )}
          {part && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${certOk ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}
            >
              {certOk ? "CERT" : "SIN CERT"}
            </span>
          )}
          {ncrOpen && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-900">
              NCR
            </span>
          )}
          {revMismatch && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
              REV
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        {!part && canInstall && (
          <div className="flex items-center gap-1">
            <select
              className="rounded border border-zinc-300 px-1 py-0.5"
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
            >
              <option value="">S/N disponible</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.serial} rev {p.revision}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !partId}
              className="rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white"
              onClick={() =>
                run(async () => {
                  await api(`/api/positions/${position.id}/install`, {
                    method: "POST",
                    body: JSON.stringify({ partId }),
                  });
                })
              }
            >
              Instalar
            </button>
          </div>
        )}
        {part && canInstall && (
          <button
            type="button"
            disabled={busy}
            className="rounded border border-zinc-300 px-2 py-0.5 text-[11px]"
            onClick={() =>
              run(async () => {
                await api(`/api/positions/${position.id}/remove`, {
                  method: "POST",
                });
              })
            }
          >
            Quitar
          </button>
        )}
      </td>
    </tr>
  );
}
