"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BarNav from "@/components/BarNav";
import { beep, useLiveRefresh } from "@/lib/supabase-browser";
import { barTopic, formatCOP, STATUS_LABEL, type Order, type OrderStatus } from "@/lib/types";

const COLUMNS: { status: OrderStatus; title: string; empty: string }[] = [
  { status: "recibido", title: "Nuevos", empty: "Sin pedidos nuevos" },
  { status: "preparando", title: "Preparando", empty: "Nada en preparación" },
  { status: "listo", title: "Listos para entregar", empty: "Nada esperando" },
];

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export default function BarBoard({ barName }: { barName: string }) {
  const [active, setActive] = useState<Order[]>([]);
  const [done, setDone] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sound, setSound] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const known = useRef<Set<string> | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const load = useCallback(async () => {
    const res = await fetch("/api/bar/orders", { cache: "no-store" }).catch(() => null);
    if (!res) return;
    if (res.status === 401) {
      window.location.href = "/bar/login";
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as { active: Order[]; done: Order[] };

    const ids = new Set(data.active.map((o) => o.id));
    if (known.current) {
      const newOnes = data.active.filter((o) => o.status === "recibido" && !known.current!.has(o.id));
      if (newOnes.length) {
        if (soundRef.current) beep(2);
        setFresh((f) => new Set([...f, ...newOnes.map((o) => o.id)]));
        setTimeout(() => setFresh((f) => {
          const n = new Set(f);
          newOnes.forEach((o) => n.delete(o.id));
          return n;
        }), 4000);
      }
    }
    known.current = ids;
    setActive(data.active);
    setDone(data.done);
    setLoaded(true);
  }, []);

  useLiveRefresh(barTopic, load, 20000);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const pending = active.filter((o) => o.status === "recibido").length;
    document.title = pending ? `(${pending}) Pedidos · ${barName}` : `Pedidos · ${barName}`;
  }, [active, barName]);

  async function move(order: Order, status: OrderStatus) {
    setBusy(order.id);
    // Actualización optimista: se ve el cambio al instante.
    setActive((list) =>
      status === "entregado" || status === "cancelado"
        ? list.filter((o) => o.id !== order.id)
        : list.map((o) => (o.id === order.id ? { ...o, status } : o)),
    );
    await fetch(`/api/bar/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    setBusy(null);
    load();
  }

  async function togglePaid(order: Order) {
    const payment_status = order.payment_status === "pagado" ? "en_barra" : "pagado";
    setActive((list) => list.map((o) => (o.id === order.id ? { ...o, payment_status } : o)));
    await fetch(`/api/bar/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status }),
    }).catch(() => null);
    load();
  }

  function enableSound() {
    setSound((s) => {
      if (!s) beep(1);
      return !s;
    });
  }

  return (
    <div className="bar-shell">
      <BarNav barName={barName}>
        <button className={`btn ${sound ? "btn-ok" : ""}`} onClick={enableSound} title="Sonar con cada pedido nuevo">
          {sound ? "🔔 Sonido activo" : "🔕 Activar sonido"}
        </button>
      </BarNav>

      <main className="bar-main">
        {!loaded && <div className="empty">Cargando pedidos…</div>}

        {loaded && (
          <div className="board">
            {COLUMNS.map((col) => {
              const list = active.filter((o) => o.status === col.status);
              return (
                <section key={col.status} className="col">
                  <div className="col-head">
                    <h2>{col.title}</h2>
                    <span className="count">{list.length}</span>
                  </div>
                  {list.length === 0 && <div className="empty">{col.empty}</div>}
                  {list.map((o) => {
                    const mins = minutesSince(o.created_at, now);
                    return (
                      <article key={o.id} className={`ticket ${fresh.has(o.id) ? "fresh" : ""}`}>
                        <div className="row between">
                          <span className="num">#{o.number}</span>
                          <span className="pill pill-accent">Mesa {o.table_label}</span>
                        </div>
                        <div className="row between" style={{ marginTop: 4 }}>
                          <span style={{ fontWeight: 600 }}>{o.customer_name}</span>
                          <span className={`small ${mins >= 15 && o.status !== "listo" ? "late" : "muted"}`}>
                            hace {mins} min
                          </span>
                        </div>
                        <ul>
                          {o.order_items.map((it) => (
                            <li key={it.id}><b>{it.qty}×</b><span>{it.name}</span></li>
                          ))}
                        </ul>
                        {o.note && <div className="note">📝 {o.note}</div>}
                        <div className="row between small" style={{ marginBottom: 10 }}>
                          <span className="muted">{formatCOP(o.total)}</span>
                          <button
                            className={`pill ${o.payment_status === "pagado" ? "pill-ok" : "pill-warn"}`}
                            onClick={() => togglePaid(o)}
                            style={{ cursor: "pointer" }}
                            title="Marcar pago"
                          >
                            {o.payment_status === "pagado" ? "✓ Pagado" : "Por cobrar"}
                          </button>
                        </div>
                        <div className="actions">
                          {o.status === "recibido" && (
                            <button className="btn btn-primary grow" disabled={busy === o.id} onClick={() => move(o, "preparando")}>
                              Preparar
                            </button>
                          )}
                          {o.status === "preparando" && (
                            <button className="btn btn-ok grow" disabled={busy === o.id} onClick={() => move(o, "listo")}>
                              🔔 Listo · avisar
                            </button>
                          )}
                          {o.status === "listo" && (
                            <>
                              <button className="btn btn-ok grow" disabled={busy === o.id} onClick={() => move(o, "entregado")}>
                                Entregado
                              </button>
                              <button className="btn btn-ghost" disabled={busy === o.id} onClick={() => move(o, "preparando")}>
                                Deshacer
                              </button>
                            </>
                          )}
                          {o.status !== "listo" && (
                            <button
                              className="btn btn-danger"
                              disabled={busy === o.id}
                              onClick={() => confirm(`¿Cancelar el pedido #${o.number}?`) && move(o, "cancelado")}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </section>
              );
            })}
          </div>
        )}

        {done.length > 0 && (
          <details className="card" style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Últimos entregados / cancelados ({done.length})</summary>
            <table className="table" style={{ marginTop: 10 }}>
              <thead>
                <tr><th>#</th><th>Mesa</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Pago</th></tr>
              </thead>
              <tbody>
                {done.map((o) => (
                  <tr key={o.id}>
                    <td>{o.number}</td>
                    <td>{o.table_label}</td>
                    <td>{o.customer_name}</td>
                    <td>{formatCOP(o.total)}</td>
                    <td>{STATUS_LABEL[o.status]}</td>
                    <td>{o.payment_status === "pagado" ? "Pagado" : "Por cobrar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </main>
    </div>
  );
}
