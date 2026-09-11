import { useState } from "react";
import { ApiError, api } from "../api";

export function ResetDemo() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onReset() {
    const token = window.prompt("Token de reset de demo");
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/demo/reset", {
        method: "POST",
        headers: { "X-Demo-Reset-Token": token },
        body: JSON.stringify({}),
      });
      setMsg("Seed restaurado");
      window.location.assign("/vehicles");
    } catch (e) {
      if (e instanceof ApiError) {
        setMsg(e.status === 401 ? "Token inválido" : e.message);
      } else {
        setMsg("Error de reset");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        className="text-xs text-zinc-500 underline"
        onClick={() => void onReset()}
      >
        Reset demo
      </button>
      {msg && <span className="text-[11px] text-zinc-500">{msg}</span>}
    </span>
  );
}
