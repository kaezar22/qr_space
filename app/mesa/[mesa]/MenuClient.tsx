"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getName, getOrders, saveOrder, setName, type SavedOrder } from "@/lib/local";
import { formatCOP, type Product } from "@/lib/types";

interface Props {
  table: string;
  products: Product[];
  barName: string;
}

export default function MenuClient({ table, products, barName }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setNameState] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<SavedOrder[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    setNameState(getName());
    setRecent(getOrders());
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return [...map.entries()];
  }, [products]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart)
    .filter(([id, q]) => q > 0 && byId.has(id))
    .map(([id, qty]) => ({ product: byId.get(id)!, qty }));
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.product.price, 0);

  const change = (id: string, delta: number) =>
    setCart((c) => {
      const next = Math.max(0, Math.min(20, (c[id] ?? 0) + delta));
      const copy = { ...c, [id]: next };
      if (next === 0) delete copy[id];
      return copy;
    });

  const jumpTo = (cat: string) => {
    setActiveCat(cat);
    sectionRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  async function submit() {
    setError(null);
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError("Escribe tu nombre para que sepamos a quién llevarle el pedido.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table,
          name: cleanName,
          note,
          items: lines.map((l) => ({ product_id: l.product.id, qty: l.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el pedido");
      setName(cleanName);
      saveOrder({ id: data.id, number: data.number, table, at: Date.now() });
      // Pedimos permiso de notificaciones aprovechando el toque del usuario.
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      router.push(`/pedido/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el pedido");
      setSending(false);
    }
  }

  return (
    <main className="client">
      <header className="client-head">
        <div className="row between">
          <span className="pill pill-accent">Mesa {table}</span>
          {name && <span className="muted small">Hola, {name.split(" ")[0]} 👋</span>}
        </div>
        <h1 className="display" style={{ marginTop: 14 }}>{barName}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Elige, pide y te avisamos cuando esté listo.</p>
      </header>

      {recent.length > 0 && (
        <div className="card row between" style={{ marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Tienes un pedido en curso</div>
            <div className="muted small">Pedido #{recent[0].number} · Mesa {recent[0].table}</div>
          </div>
          <Link className="btn" href={`/pedido/${recent[0].id}`}>Ver estado</Link>
        </div>
      )}

      {categories.length > 1 && (
        <nav className="tabs" aria-label="Categorías">
          {categories.map(([cat]) => (
            <button key={cat} className={`tab ${activeCat === cat ? "active" : ""}`} onClick={() => jumpTo(cat)}>
              {cat}
            </button>
          ))}
        </nav>
      )}

      {products.length === 0 && <div className="empty">El menú está vacío por ahora.</div>}

      {categories.map(([cat, items]) => (
        <section key={cat} ref={(el) => { sectionRefs.current[cat] = el; }} style={{ scrollMarginTop: 60 }}>
          <h2 className="cat-title">{cat}</h2>
          {items.map((p) => {
            const q = cart[p.id] ?? 0;
            return (
              <article key={p.id} className={`product ${q ? "in-cart" : ""}`}>
                <div className="grow">
                  <h3>{p.name}</h3>
                  {p.description && <div className="muted small">{p.description}</div>}
                  <div className="price">{formatCOP(p.price)}</div>
                </div>
                {q === 0 ? (
                  <button className="btn btn-primary" onClick={() => change(p.id, 1)}>Agregar</button>
                ) : (
                  <div className="qty">
                    <button className="btn btn-round" aria-label="Quitar uno" onClick={() => change(p.id, -1)}>−</button>
                    <span>{q}</span>
                    <button className="btn btn-round" aria-label="Agregar uno" onClick={() => change(p.id, 1)}>+</button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ))}

      {count > 0 && !open && (
        <div className="cart-bar">
          <div className="inner">
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setOpen(true)}>
              Ver pedido ({count}) · {formatCOP(total)}
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="sheet-backdrop" onClick={() => !sending && setOpen(false)}>
          <div className="sheet" role="dialog" aria-label="Tu pedido" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h2>Tu pedido</h2>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={sending}>Seguir viendo</button>
            </div>

            <div style={{ margin: "10px 0" }}>
              {lines.map(({ product, qty }) => (
                <div key={product.id} className="line-item">
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div className="muted small">{formatCOP(product.price)} c/u</div>
                  </div>
                  <div className="qty">
                    <button className="btn btn-round" onClick={() => change(product.id, -1)}>−</button>
                    <span>{qty}</span>
                    <button className="btn btn-round" onClick={() => change(product.id, 1)}>+</button>
                  </div>
                </div>
              ))}
              {lines.length === 0 && <div className="empty">Tu pedido está vacío.</div>}
            </div>

            <div className="total"><span>Total</span><span>{formatCOP(total)}</span></div>

            <div className="stack">
              <label className="field">
                Tu nombre
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setNameState(e.target.value)}
                  placeholder="Ej: Laura"
                  maxLength={40}
                  autoComplete="given-name"
                />
              </label>
              <label className="field">
                Nota para el bar (opcional)
                <textarea
                  className="textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: sin hielo, la michelada con sal"
                  maxLength={200}
                />
              </label>
              <p className="muted small" style={{ margin: 0 }}>💳 Pagas en la barra al recibir tu pedido.</p>
              {error && <div className="error">{error}</div>}
              <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={sending || lines.length === 0}>
                {sending ? "Enviando…" : `Pedir · ${formatCOP(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
