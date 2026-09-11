import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import type { VehicleListItem } from "../types";

export function VehicleList() {
  const [items, setItems] = useState<VehicleListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ vehicles: VehicleListItem[] }>("/api/vehicles")
      .then((d) => setItems(d.vehicles))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!items) return <p className="text-zinc-500">Cargando vehículos…</p>;

  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">Unidades</h1>
      <div className="overflow-hidden border border-zinc-300 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-[11px] uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Programa</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Etapa crítica</th>
              <th className="px-3 py-2">Bloqueos</th>
              <th className="px-3 py-2">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {items.map((v) => (
              <tr key={v.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2">
                  <Link className="font-mono font-semibold underline" to={`/vehicles/${v.id}`}>
                    {v.code}
                  </Link>
                  <div className="text-xs text-zinc-500">{v.name}</div>
                </td>
                <td className="px-3 py-2">{v.program}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-3 py-2">
                  {v.criticalStage ? (
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{v.criticalStage.code}</span>
                      <StatusBadge status={v.criticalStage.status} />
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 font-mono">
                  {v.criticalStage?.blockerCount ?? 0}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {new Date(v.updatedAt).toLocaleString("es-ES")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
