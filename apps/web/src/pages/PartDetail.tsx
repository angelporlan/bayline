import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { AuditTimeline } from "../components/AuditTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { PART_STATUS } from "../labels";
import { useRole } from "../role";
import type { PartDetail as PartDetailType, PartStatus } from "../types";

export function PartDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();
  const [part, setPart] = useState<PartDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certType, setCertType] = useState<"NDT" | "COC" | "MATERIAL">("COC");
  const [certTitle, setCertTitle] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setPart(await api<PartDetailType>(`/api/parts/${id}`));
  }, [id]);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!part) return <p className="text-zinc-500">Cargando pieza…</p>;

  const transitions = (part.allowedTransitions ?? []).filter((t) => {
    if (t === "SCRAPPED" || t === "BLOCKED") return role === "quality";
    if (t === "INSTALLED") return Boolean(part.position);
    return true;
  });

  async function changeStatus(status: PartStatus) {
    if (!part) return;
    try {
      await api(`/api/parts/${part.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function attachCert(e: FormEvent) {
    e.preventDefault();
    if (!part) return;
    try {
      await api(`/api/parts/${part.id}/certificates`, {
        method: "POST",
        body: JSON.stringify({
          type: certType,
          title: certTitle || `${certType} ${part.serial}`,
          issuedAt: new Date().toISOString(),
        }),
      });
      setCertTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-zinc-500">
        {part.position ? (
          <Link className="underline" to={`/vehicles/${part.position.stage.vehicle.id}`}>
            {part.position.stage.vehicle.code} · {part.position.code}
          </Link>
        ) : (
          "Sin posición"
        )}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold">{part.serial}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-sm">{part.pn}</span>
            <StatusBadge kind="part" status={part.status} />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden border border-zinc-300 bg-zinc-200 md:grid-cols-4">
        {[
          ["Lote", part.lot],
          ["Revisión", part.revision],
          ["Proveedor", part.supplier],
          ["Estado", PART_STATUS[part.status]],
        ].map(([k, v]) => (
          <div key={k} className="bg-white px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Máquina de estados
        </h2>
        <div className="flex flex-wrap gap-2">
          {transitions.map((t) => (
            <button
              key={t}
              type="button"
              className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm"
              onClick={() => void changeStatus(t)}
            >
              → {PART_STATUS[t]}
            </button>
          ))}
          {transitions.length === 0 && (
            <span className="text-sm text-zinc-500">Sin transiciones legales.</span>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Certificados
        </h2>
        <table className="mb-3 w-full border border-zinc-300 bg-white text-left text-sm">
          <thead className="bg-zinc-100 text-[11px] uppercase text-zinc-600">
            <tr>
              <th className="px-3 py-1.5">Tipo</th>
              <th className="px-3 py-1.5">Título</th>
              <th className="px-3 py-1.5">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {part.certificates.length === 0 && (
              <tr>
                <td className="px-3 py-2 text-zinc-500" colSpan={3}>
                  Sin certificados
                </td>
              </tr>
            )}
            {part.certificates.map((c) => (
              <tr key={c.id} className="border-t border-zinc-200">
                <td className="px-3 py-1.5 font-mono">{c.type}</td>
                <td className="px-3 py-1.5">{c.title}</td>
                <td className="px-3 py-1.5 text-xs">
                  {new Date(c.issuedAt).toLocaleDateString("es-ES")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {role === "quality" && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void attachCert(e)}>
            <label className="text-xs">
              Tipo
              <select
                className="ml-1 rounded border border-zinc-300 px-2 py-1"
                value={certType}
                onChange={(e) =>
                  setCertType(e.target.value as "NDT" | "COC" | "MATERIAL")
                }
              >
                <option value="NDT">NDT</option>
                <option value="COC">COC</option>
                <option value="MATERIAL">MATERIAL</option>
              </select>
            </label>
            <label className="text-xs">
              Título
              <input
                className="ml-1 rounded border border-zinc-300 px-2 py-1"
                value={certTitle}
                onChange={(e) => setCertTitle(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-1 text-sm text-white"
            >
              Adjuntar
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          NCR ligados
        </h2>
        <ul className="border border-zinc-300 bg-white text-sm">
          {(part.ncrs ?? []).length === 0 && (
            <li className="px-3 py-2 text-zinc-500">Sin NCR</li>
          )}
          {(part.ncrs ?? []).map((n) => (
            <li key={n.id} className="border-t border-zinc-100 px-3 py-2">
              <span className="font-mono font-semibold">{n.code}</span> · {n.status} — {n.title}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Historial de auditoría
        </h2>
        <AuditTimeline events={part.events} />
      </section>
    </div>
  );
}
