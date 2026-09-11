import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import { PART_STATUS } from "../labels";
import type { PackPayload, PartStatus } from "../types";

export function PackPage() {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<PackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<PackPayload>(`/api/vehicles/${id}/pack`)
      .then(setPack)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!pack) return <p className="text-zinc-500">Cargando pack…</p>;
  const data = pack;

  function downloadJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.vehicle.code}-asbuilt.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link className="text-sm underline" to={`/vehicles/${data.vehicle.id}`}>
          ← {data.vehicle.code}
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            onClick={downloadJson}
          >
            Descargar JSON
          </button>
          <a
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            href={`/api/vehicles/${data.vehicle.id}/pack.pdf`}
          >
            Descargar PDF
          </a>
          <button
            type="button"
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
            onClick={() => window.print()}
          >
            Imprimir
          </button>
        </div>
      </div>

      <header>
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">
          Pack as-built
        </div>
        <h1 className="font-mono text-2xl font-bold">{pack.vehicle.code}</h1>
        <p className="text-sm text-zinc-600">{pack.vehicle.program}</p>
        <p className="mt-2 text-xs font-medium text-amber-800">{pack.disclaimer}</p>
        <p className="text-xs text-zinc-500">
          Generado {new Date(pack.generatedAt).toLocaleString("es-ES")}
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">
          Resumen ejecutivo
        </h2>
        <div className="flex items-center gap-2 text-sm">
          Estado vehículo: <StatusBadge status={pack.vehicle.status} />
        </div>
      </section>

      {pack.stages.map((s) => (
        <section key={s.id}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">
            {s.code} {s.name} — {s.readiness.canMarkReady ? "lista" : "bloqueada"}
          </h2>
          {s.readiness.blockers.length > 0 && (
            <ul className="mb-2 list-disc pl-5 text-sm text-red-800">
              {s.readiness.blockers.map((b, i) => (
                <li key={i}>
                  {b.code}: {b.message}
                </li>
              ))}
            </ul>
          )}
          <table className="w-full border border-zinc-300 bg-white text-left text-xs">
            <thead className="bg-zinc-100 uppercase text-zinc-600">
              <tr>
                <th className="px-2 py-1">Posición</th>
                <th className="px-2 py-1">PN</th>
                <th className="px-2 py-1">Rev</th>
                <th className="px-2 py-1">S/N</th>
                <th className="px-2 py-1">Estado</th>
                <th className="px-2 py-1">Certs</th>
              </tr>
            </thead>
            <tbody>
              {s.asBuilt.map((row) => (
                <tr key={row.position} className="border-t border-zinc-200">
                  <td className="px-2 py-1 font-mono">{row.position}</td>
                  <td className="px-2 py-1 font-mono">{row.requiredPn}</td>
                  <td className="px-2 py-1">
                    {row.partRevision ?? "—"} / {row.requiredRevision}
                  </td>
                  <td className="px-2 py-1 font-mono">{row.serial ?? "—"}</td>
                  <td className="px-2 py-1">
                    {row.partStatus
                      ? (PART_STATUS[row.partStatus as PartStatus] ?? row.partStatus)
                      : "VACÍA"}
                  </td>
                  <td className="px-2 py-1">
                    {row.certificates.map((c) => c.type).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">
          Excepciones abiertas
        </h2>
        <ul className="list-disc pl-5 text-sm">
          {pack.ecos
            .filter((e) => e.status !== "CLOSED")
            .map((e) => (
              <li key={e.code}>
                ECO {e.code} {e.affectsPn} → {e.newRevision} ({e.status})
              </li>
            ))}
          {pack.stages.flatMap((s) =>
            s.ncrs
              .filter((n) => n.status !== "CLOSED")
              .map((n) => (
                <li key={n.code}>
                  {s.code} {n.code} {n.title} ({n.status})
                </li>
              )),
          )}
        </ul>
      </section>
    </div>
  );
}
