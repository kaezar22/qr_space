"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import HelpButton from "@/components/HelpButton";
import { BRAND } from "@/lib/brand";
import { getName, getOrders, saveOrder, setName, type SavedOrder } from "@/lib/local";
import { formatCOP, formatK, productLabel, type Product } from "@/lib/types";

interface Props {
  table: string;
  products: Product[];
  barName: string;
}

/** Un producto en la carta, con uno o varios tamaños (vaso/pinta/litro...). */
interface Group {
  key: string;
  name: string;
  description: string | null;
  options: Product[];
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

  // Categorías en el orden del menú; dentro, productos agrupados por nombre.
  const categories = useMemo(() => {
    const cats = new Map<string, Map<string, Group>>();
    for (const p of products) {
      if (!cats.has(p.category)) cats.set(p.category, new Map());
      const groups = cats.get(p.category)!;
      const key = p.name.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, { key, name: p.name, description: p.description, options: [] });
      const g = groups.get(key)!;
      g.options.push(p);
      if (!g.description && p.description) g.description = p.description;
    }
    return [...cats.entries()].map(([cat, groups]) => [cat, [...groups.values()]] as const);
  }, [products]);

  // Resalta la pestaña de la categoría visible al hacer scroll.
  useEffect(() => {
    const els = Object.entries(sectionRefs.current).filter(([, el]) => el) as [string, HTMLElement][];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveCat(top.target.getAttribute("data-cat"));
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    els.forEach(([, el]) => io.observe(el));
    return () => io.disconnect();
  }, [categories]);

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

  const Qty = ({ id }: { id: string }) => {
    const q = cart[id] ?? 0;
    return q === 0 ? (
      <button className="add" aria-label="Agregar" onClick={() => change(id, 1)}>+</button>
    ) : (
      <span className="qty">
        <button className="btn-round" aria-label="Quitar uno" onClick={() => change(id, -1)}>−</button>
        <span>{q}</span>
        <button className="btn-round" aria-label="Agregar uno" onClick={() => change(id, 1)}>+</button>
      </span>
    );
  };

  return (
    <main className="client">
      <header className="brand-head">
        <div className="row between">
          <span className="table-tag">Mesa {table}</span>
          <HelpButton table={table} />
        </div>
        <h1 className="brand-name">{barName}</h1>
        <div className="brand-sub">Menú</div>
        <p className="muted small brand-tagline">
          {name ? `Hola, ${name.split(" ")[0]} · ` : ""}{BRAND.tagline}
        </p>
      </header>

      {recent.length > 0 && (
        <Link className="ongoing" href={`/pedido/${recent[0].id}`}>
          <span>
            <b>Pedido #{recent[0].number} en curso</b>
            <span className="muted small"> · Mesa {recent[0].table}</span>
          </span>
          <span className="ongoing-cta">Ver estado →</span>
        </Link>
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

      {categories.map(([cat, groups]) => (
        <section
          key={cat}
          data-cat={cat}
          ref={(el) => { sectionRefs.current[cat] = el; }}
          className="menu-section"
        >
          <h2 className="section-title">{cat}</h2>
          {BRAND.categoryNotes[cat] && <div className="section-note">{BRAND.categoryNotes[cat]}</div>}

          {groups.map((g) => {
            const single = g.options.length === 1 && !g.options[0].variant;
            const inCart = g.options.some((o) => cart[o.id]);
            return (
              <article key={g.key} className={`item ${inCart ? "in-cart" : ""}`}>
                {single ? (
                  <div className="item-row">
                    <div className="grow">
                      <h3 className="item-name">{g.name}</h3>
                      {g.description && <p className="item-desc">{g.description}</p>}
                    </div>
                    <div className="item-side">
                      <span className="item-price">{formatK(g.options[0].price)}</span>
                      <Qty id={g.options[0].id} />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="item-name">{g.name}</h3>
                    {g.description && <p className="item-desc">{g.description}</p>}
                    <div className="variants">
                      {g.options.map((o) => (
                        <div key={o.id} className={`variant ${cart[o.id] ? "on" : ""}`}>
                          <span className="variant-label">{o.variant ?? "Único"}</span>
                          <span className="item-price">{formatK(o.price)}</span>
                          <Qty id={o.id} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </section>
      ))}

      <footer className="brand-foot">
        <div className="brand-foot-name">{barName}</div>
        <div>{BRAND.address}</div>
      </footer>

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
              <h2 className="section-title" style={{ margin: 0, textAlign: "left" }}>Tu pedido</h2>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={sending}>Seguir viendo</button>
            </div>

            <div style={{ margin: "10px 0" }}>
              {lines.map(({ product, qty }) => (
                <div key={product.id} className="line-item">
                  <div className="grow">
                    <div className="item-name" style={{ fontSize: "1rem" }}>{productLabel(product)}</div>
                    <div className="muted small">{formatCOP(product.price)} c/u</div>
                  </div>
                  <span className="qty">
                    <button className="btn-round" onClick={() => change(product.id, -1)}>−</button>
                    <span>{qty}</span>
                    <button className="btn-round" onClick={() => change(product.id, 1)}>+</button>
                  </span>
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
                  placeholder="Ej: la michelada con sal, sin hielo"
                  maxLength={200}
                />
              </label>
              <p className="muted small" style={{ margin: 0 }}>Pagas en la barra al recibir tu pedido.</p>
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
