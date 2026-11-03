"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { beep, useLiveRefresh } from "@/lib/supabase-browser";
import { formatCOP, orderTopic, STATUS_LABEL, type Order } from "@/lib/types";

const STEP: Record<string, number> = { recibido: 1, preparando: 2, listo: 3, entregado: 3 };

async function showSystemNotification(order: Order) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const title = `¡${order.customer_name.split(" ")[0]}, tu pedido está listo!`;
  const body = `Pedido #${order.number} · acércate a la barra.`;
  const url = `/pedido/${order.id}`;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, tag: "pedido", data: { url } });
      return;
    }
    new Notification(title, { body });
  } catch {
    /* algunos navegadores no permiten notificaciones aquí */
  }
}

export default function OrderTracker({ id, barName }: { id: string; barName: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const prevStatus = useRef<string | null>(null);

  useEffect(() => {
    setPerm("Notification" in window ? Notification.permission : "unsupported");
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" }).catch(() => null);
    if (!res) return;
    if (res.status === 404) return setNotFound(true);
    if (!res.ok) return;
    const data = (await res.json()) as Order;

    if (data.status === "listo" && prevStatus.current !== "listo") {
      beep(4);
      navigator.vibrate?.([300, 120, 300, 120, 600]);
      showSystemNotification(data);
    }
    prevStatus.current = data.status;
    setOrder(data);
  }, [id]);

  useLiveRefresh(orderTopic(id), load, 12000);

  // Título parpadeante cuando está listo y la pestaña está en segundo plano.
  useEffect(() => {
    if (order?.status !== "listo") {
      document.title = barName;
      return;
    }
    let on = false;
    const t = setInterval(() => {
      on = !on;
      document.title = on ? "🔔 ¡Pedido listo!" : barName;
    }, 1000);
    return () => clearInterval(t);
  }, [order?.status, barName]);

  async function askPermission() {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") beep(1); // de paso "desbloquea" el audio en iPhone
  }

  if (notFound) {
    return (
      <main className="client">
        <div className="card" style={{ marginTop: 40 }}>
          <h2>No encontramos este pedido</h2>
          <p className="muted">Es posible que el enlace esté incompleto.</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return <main className="client"><div className="empty" style={{ marginTop: 60 }}>Cargando tu pedido…</div></main>;
  }

  const ready = order.status === "listo";
  const delivered = order.status === "entregado";
  const cancelled = order.status === "cancelado";
  const step = STEP[order.status] ?? 0;

  const hero = cancelled
    ? { icon: "✋", title: "Pedido cancelado", sub: "Si es un error, acércate a la barra." }
    : delivered
      ? { icon: "🥂", title: "¡Salud!", sub: "Tu pedido fue entregado. Disfrútalo." }
      : ready
        ? { icon: "🔔", title: "¡Tu pedido está listo!", sub: "Acércate a la barra a recogerlo." }
        : order.status === "preparando"
          ? { icon: "🍸", title: "Estamos preparando tu pedido", sub: "Te avisamos aquí apenas esté listo." }
          : { icon: "🧾", title: "Recibimos tu pedido", sub: "En un momento empezamos a prepararlo." };

  return (
    <main className="client">
      <header className="client-head">
        <div className="row between">
          <span className="pill pill-accent">Mesa {order.table_label}</span>
          <span className="muted small">{barName}</span>
        </div>
      </header>

      <section className={`status-hero ${ready ? "ready" : ""}`} aria-live="polite">
        <div className="big">{hero.icon}</div>
        <div className="muted small">Pedido #{order.number} · {order.customer_name}</div>
        <h1 className="display" style={{ fontSize: "1.9rem", marginTop: 6 }}>{hero.title}</h1>
        <p className="muted" style={{ margin: "8px 0 0" }}>{hero.sub}</p>
        {!cancelled && (
          <div className={`steps ${step === 3 ? "done" : ""}`}>
            {[1, 2, 3].map((s) => <div key={s} className={s <= step ? "on" : ""} />)}
          </div>
        )}
        {!cancelled && (
          <div className="row between small muted">
            <span>Recibido</span><span>Preparando</span><span>Listo</span>
          </div>
        )}
      </section>

      {!ready && !delivered && !cancelled && perm === "default" && (
        <div className="card row between" style={{ marginTop: 14 }}>
          <div className="small">Activa los avisos para enterarte aunque estés en otra app.</div>
          <button className="btn btn-primary" onClick={askPermission}>Activar</button>
        </div>
      )}
      {!ready && !delivered && !cancelled && (
        <p className="muted small" style={{ textAlign: "center", marginTop: 12 }}>
          Mantén esta página abierta: sonará y vibrará cuando tu pedido esté listo.
        </p>
      )}

      <section className="card" style={{ marginTop: 14 }}>
        <div className="row between">
          <h2 style={{ fontSize: "1.05rem" }}>Detalle</h2>
          <span className={`pill ${ready ? "pill-ok" : delivered ? "pill-ok" : cancelled ? "pill-danger" : "pill-warn"}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        {order.order_items.map((it) => (
          <div key={it.id} className="line-item">
            <b style={{ color: "var(--accent)", minWidth: 28 }}>{it.qty}×</b>
            <span className="grow">{it.name}</span>
            <span className="muted">{formatCOP(it.qty * it.unit_price)}</span>
          </div>
        ))}
        {order.note && <p className="muted small">Nota: {order.note}</p>}
        <div className="total"><span>Total</span><span>{formatCOP(order.total)}</span></div>
        <p className="muted small" style={{ margin: 0 }}>
          {order.payment_status === "pagado" ? "✅ Pagado" : "💳 Pagas en la barra al recoger."}
        </p>
      </section>

      <div className="stack" style={{ marginTop: 16 }}>
        <Link className="btn btn-block" href={`/mesa/${encodeURIComponent(order.table_label)}`}>
          Pedir algo más
        </Link>
      </div>
    </main>
  );
}
