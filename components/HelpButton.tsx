"use client";

import { useCallback, useEffect, useState } from "react";
import { getHelpId, getName, setHelpId } from "@/lib/local";
import { beep, useLiveRefresh } from "@/lib/supabase-browser";
import { HELP_REASONS, helpTopic, type HelpReason, type HelpRequest } from "@/lib/types";

/**
 * Botón "Ayuda" para la mesa: avisa a la barra y muestra cuando alguien va en camino.
 */
export default function HelpButton({ table }: { table: string }) {
  const [open, setOpen] = useState(false);
  const [helpId, setHelpIdState] = useState<string | null>(null);
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => setHelpIdState(getHelpId(table)), [table]);

  const load = useCallback(async () => {
    if (!helpId) return;
    const res = await fetch(`/api/help/${helpId}`, { cache: "no-store" }).catch(() => null);
    if (!res) return;
    if (res.status === 404) {
      setHelpId(table, null);
      setHelpIdState(null);
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as HelpRequest;
    if (data.status === "atendida") {
      beep(2);
      navigator.vibrate?.([200, 100, 200]);
      setToast("Alguien del bar va en camino a tu mesa.");
      setTimeout(() => setToast(null), 9000);
    }
    setRequest(data);
    if (data.status !== "pendiente") {
      setHelpId(table, null);
      setHelpIdState(null);
    }
  }, [helpId, table]);

  useLiveRefresh(helpId ? helpTopic(helpId) : null, load, 10000);

  const pending = request?.status === "pendiente" && !!helpId;

  async function send(reason: HelpReason) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, reason, name: getName() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No pudimos avisar a la barra");
      setHelpId(table, data.id);
      setHelpIdState(data.id);
      setRequest(data);
      setOpen(false);
      setToast("Listo, avisamos a la barra. Ya vienen.");
      setTimeout(() => setToast(null), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos avisar a la barra");
    } finally {
      setSending(false);
    }
  }

  async function cancel() {
    if (!helpId) return;
    await fetch(`/api/help/${helpId}`, { method: "DELETE" }).catch(() => null);
    setHelpId(table, null);
    setHelpIdState(null);
    setRequest(null);
    setOpen(false);
  }

  const current = HELP_REASONS.find((r) => r.value === request?.reason);

  return (
    <>
      <button className={`help-btn ${pending ? "pending" : ""}`} onClick={() => setOpen(true)}>
        {pending ? "🔔 Avisado" : "🙋 Ayuda"}
      </button>

      {toast && <div className="help-toast" role="status">{toast}</div>}

      {open && (
        <div className="sheet-backdrop" onClick={() => !sending && setOpen(false)}>
          <div className="sheet" role="dialog" aria-label="Pedir ayuda" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h2 className="section-title" style={{ margin: 0, textAlign: "left" }}>
                {pending ? "Ya avisamos" : "¿En qué te ayudamos?"}
              </h2>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cerrar</button>
            </div>

            {pending ? (
              <div className="stack" style={{ marginTop: 16 }}>
                <div className="help-status">
                  <div className="big">{current?.icon ?? "🙋"}</div>
                  <div className="item-name">{current?.label ?? "Necesito atención"}</div>
                  <p className="muted small" style={{ margin: "6px 0 0" }}>
                    La barra ya recibió tu aviso de la mesa {table}. Te avisamos aquí cuando alguien vaya en camino.
                  </p>
                </div>
                <p className="muted small" style={{ margin: 0 }}>¿Necesitas otra cosa? Cambia el motivo:</p>
                <div className="help-options">
                  {HELP_REASONS.filter((r) => r.value !== request?.reason).map((r) => (
                    <button key={r.value} className="help-option compact" disabled={sending} onClick={() => send(r.value)}>
                      <span className="icon">{r.icon}</span>
                      <span className="item-name">{r.label}</span>
                    </button>
                  ))}
                </div>
                <button className="btn btn-ghost" onClick={cancel}>Ya no lo necesito</button>
              </div>
            ) : (
              <div className="help-options" style={{ marginTop: 16 }}>
                {HELP_REASONS.map((r) => (
                  <button key={r.value} className="help-option" disabled={sending} onClick={() => send(r.value)}>
                    <span className="icon">{r.icon}</span>
                    <span>
                      <span className="item-name">{r.label}</span>
                      <span className="item-desc" style={{ display: "block" }}>{r.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
          </div>
        </div>
      )}
    </>
  );
}
