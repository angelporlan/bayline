import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, api } from "../api";
import { BlockerList } from "../components/BlockerList";
import { PositionTable } from "../components/PositionTable";
import { StatusBadge } from "../components/StatusBadge";
import { VEHICLE_STATUS } from "../labels";
import { useRole } from "../role";
import type {
  ReadinessBlocker,
  ReadinessResult,
  VehicleDetail as VehicleDetailType,
} from "../types";

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();
  const [vehicle, setVehicle] = useState<VehicleDetailType | null>(null);
  const [stageCode, setStageCode] = useState("S2");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [markMessage, setMarkMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await api<VehicleDetailType>(`/api/vehicles/${id}`);
    setVehicle(data);
  }, [id]);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  const stage = useMemo(
    () => vehicle?.stages.find((s) => s.code === stageCode) ?? vehicle?.stages[0],
    [vehicle, stageCode],
  );

  if (error) return <p className="text-red-700">{error}</p>;
  if (!vehicle || !stage) return <p className="text-zinc-500">Cargando vehículo…</p>;

  const readiness = stage.readiness;
  const semaphore = readiness.canMarkReady
    ? vehicle.status === "READY_FOR_TEST" || stage.status === "READY_FOR_TEST"
      ? "READY_FOR_TEST"
      : "IN_BUILD"
    : "BLOCKED";

  async function markReady() {
    if (!vehicle || !stage) return;
    setBusy(true);
    setMarkMessage(null);
    try {
      await api<ReadinessResult>(
        `/api/vehicles/${vehicle.id}/stages/${stage.id}/mark-ready`,
        { method: "POST" },
      );
      setMarkMessage("Etapa marcada lista para ensayo.");
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const body = e.body as { blockers?: ReadinessBlocker[] };
        setMarkMessage(
          `El servidor se niega: ${body.blockers?.length ?? 0} bloqueo(s).`,
        );
        await load();
      } else {
        setError(e instanceof Error ? e.message : "Error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function closeNcr(ncrId: string) {
    await api(`/api/ncrs/${ncrId}/close`, { method: "POST" });
    await load();
  }

  async function closeEco(ecoId: string) {
    await api(`/api/ecos/${ecoId}/close`, { method: "POST" });
    await load();
  }

  async function attachCert(partId: string, type: "NDT" | "COC") {
    await api(`/api/parts/${partId}/certificates`, {
      method: "POST",
      body: JSON.stringify({
        type,
        title: `${type} ${new Date().toISOString().slice(0, 10)}`,
        issuedAt: new Date().toISOString(),
      }),
    });
    await load();
  }

  async function setPartStatus(partId: string, status: string) {
    await api(`/api/parts/${partId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
            {vehicle.program}
          </div>
          <h1 className="font-mono text-2xl font-bold">{vehicle.code}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
            {vehicle.name}
            <StatusBadge status={vehicle.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            to={`/vehicles/${vehicle.id}/pack`}
          >
            Pack as-built
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-300">
        {vehicle.stages.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`px-3 py-1.5 text-sm ${s.code === stage.code ? "border-b-2 border-zinc-900 font-semibold" : "text-zinc-500"}`}
            onClick={() => setStageCode(s.code)}
          >
            {s.code} · {s.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-4">
        <div
          className={`flex flex-col justify-center border px-4 py-6 text-center ${
            semaphore === "BLOCKED"
              ? "border-red-400 bg-red-50"
              : semaphore === "READY_FOR_TEST"
                ? "border-emerald-400 bg-emerald-50"
                : "border-zinc-300 bg-white"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
            Semáforo {stage.code}
          </div>
          <div className="mt-2 text-lg font-bold">
            {VEHICLE_STATUS[semaphore]}
          </div>
          <div className="mt-1 font-mono text-xs text-zinc-500">{semaphore}</div>
        </div>
        <BlockerList blockers={readiness.blockers} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => void markReady()}
        >
          Marcar lista para ensayo
        </button>
        <span className="text-xs text-zinc-500">
          La decisión la toma el servidor. El botón no evalúa en el cliente.
        </span>
        {(busy || markMessage) && (
          <span className="text-sm font-medium text-zinc-800">
            {busy ? "Consultando al servidor…" : markMessage}
          </span>
        )}
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
        Árbol as-built
      </h2>
      <PositionTable
        positions={stage.positions}
        availableParts={vehicle.availableParts}
        onChanged={load}
        onError={(m) => setError(m)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-zinc-300 bg-white">
          <h3 className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
            NCR de la etapa
          </h3>
          <ul className="divide-y divide-zinc-100 text-sm">
            {stage.ncrs.length === 0 && (
              <li className="px-3 py-2 text-zinc-500">Sin NCR</li>
            )}
            {stage.ncrs.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-2 px-3 py-2">
                <div>
                  <div className="font-mono font-semibold">
                    {n.code} · {n.status}
                  </div>
                  <div>{n.title}</div>
                  <div className="text-xs text-zinc-500">{n.detail}</div>
                </div>
                {n.status !== "CLOSED" && role === "quality" && (
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                    onClick={() => void closeNcr(n.id).catch((e: Error) => setError(e.message))}
                  >
                    Cerrar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section className="border border-zinc-300 bg-white">
          <h3 className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
            ECO del vehículo
          </h3>
          <ul className="divide-y divide-zinc-100 text-sm">
            {vehicle.ecos.length === 0 && (
              <li className="px-3 py-2 text-zinc-500">Sin ECO</li>
            )}
            {vehicle.ecos.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-2 px-3 py-2">
                <div>
                  <div className="font-mono font-semibold">
                    {e.code} · {e.status}
                  </div>
                  <div>{e.title}</div>
                  <div className="text-xs text-zinc-500">
                    {e.affectsPn} → rev {e.newRevision}
                  </div>
                </div>
                {e.status !== "CLOSED" && role === "engineering" && (
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                    onClick={() => void closeEco(e.id).catch((err: Error) => setError(err.message))}
                  >
                    Cerrar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="border border-zinc-300 bg-white">
        <h3 className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
          Acciones rápidas de pieza (según rol)
        </h3>
        <ul className="divide-y divide-zinc-100 text-sm">
          {stage.positions
            .filter((p) => p.installedPart)
            .map((p) => {
              const part = p.installedPart;
              if (!part) return null;
              const needsCert = !part.certificates.some(
                (c) => c.type === "NDT" || c.type === "COC",
              );
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="font-mono text-xs">{p.code}</span>
                  <Link className="underline" to={`/parts/${part.id}`}>
                    {part.serial}
                  </Link>
                  <StatusBadge kind="part" status={part.status} />
                  {part.status === "INSPECTED" &&
                    (role === "operator" || role === "quality") && (
                      <button
                        type="button"
                        className="rounded border border-zinc-300 px-2 py-0.5 text-xs"
                        onClick={() =>
                          void setPartStatus(part.id, "NDT_OK").catch((e: Error) =>
                            setError(e.message),
                          )
                        }
                      >
                        Pasar a NDT_OK
                      </button>
                    )}
                  {needsCert && role === "quality" && (
                    <>
                      <button
                        type="button"
                        className="rounded border border-zinc-300 px-2 py-0.5 text-xs"
                        onClick={() =>
                          void attachCert(part.id, "NDT").catch((e: Error) =>
                            setError(e.message),
                          )
                        }
                      >
                        Adjuntar NDT
                      </button>
                      <button
                        type="button"
                        className="rounded border border-zinc-300 px-2 py-0.5 text-xs"
                        onClick={() =>
                          void attachCert(part.id, "COC").catch((e: Error) =>
                            setError(e.message),
                          )
                        }
                      >
                        Adjuntar COC
                      </button>
                    </>
                  )}
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}
