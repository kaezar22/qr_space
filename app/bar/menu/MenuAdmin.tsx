"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCOP, type Product } from "@/lib/types";

const empty = { name: "", description: "", category: "", price: "", variant: "" };

export default function MenuAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(empty);

  async function load() {
    const res = await fetch("/api/bar/products", { cache: "no-store" });
    if (res.status === 401) return (window.location.href = "/bar/login");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);

  async function patch(id: string, body: Record<string, unknown>) {
    setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...body } as Product : p)));
    const res = await fetch(`/api/bar/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || "No se pudo guardar");
    load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/bar/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price.replace(/\D/g, "")) }),
    });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || "No se pudo crear");
    setForm({ ...empty, category: form.category });
    load();
  }

  async function remove(p: Product) {
    if (!confirm(`¿Borrar "${p.name}" del menú? Si solo se agotó, mejor desactívalo.`)) return;
    await fetch(`/api/bar/products/${p.id}`, { method: "DELETE" });
    load();
  }

  function startEdit(p: Product) {
    setEditing(p.id);
    setDraft({ name: p.name, description: p.description ?? "", category: p.category, price: String(p.price), variant: p.variant ?? "" });
  }

  async function saveEdit(id: string) {
    await patch(id, { ...draft, price: Number(draft.price.replace(/\D/g, "")) });
    setEditing(null);
  }

  return (
    <div className="stack">
      <div className="row between wrap">
        <h1 className="display" style={{ fontSize: "1.8rem" }}>Menú</h1>
        <span className="muted small">Desactiva un producto cuando se agote: deja de verse al instante.</span>
      </div>

      <form className="card stack" onSubmit={create}>
        <h2 style={{ fontSize: "1.05rem" }}>Agregar producto</h2>
        <div className="row wrap">
          <input className="input grow" style={{ minWidth: 180 }} placeholder="Nombre" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" style={{ width: 150 }} placeholder="Precio" inputMode="numeric" value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input className="input" style={{ width: 170 }} placeholder="Categoría" list="cats" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="input" style={{ width: 150 }} placeholder="Tamaño (opcional)" list="variants" value={form.variant}
            onChange={(e) => setForm({ ...form, variant: e.target.value })} />
          <datalist id="variants">{["Vaso", "Pinta", "Litro", "Trago", "Media", "Botella"].map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <input className="input" placeholder="Descripción corta (opcional)" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <p className="muted small" style={{ margin: 0 }}>
          Para un producto con varios tamaños (vaso, pinta, litro…), agrégalo una vez por tamaño con el mismo nombre: el cliente lo verá en una sola tarjeta.
        </p>
        {error && <div className="error">{error}</div>}
        <div><button className="btn btn-primary">Agregar</button></div>
      </form>

      {loading && <div className="empty">Cargando…</div>}

      {categories.map((cat) => (
        <section key={cat} className="card">
          <h2 className="cat-title" style={{ marginTop: 0 }}>{cat}</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr><th>Disponible</th><th>Producto</th><th>Precio</th><th /></tr>
              </thead>
              <tbody>
                {products.filter((p) => p.category === cat).map((p) =>
                  editing === p.id ? (
                    <tr key={p.id}>
                      <td />
                      <td>
                        <div className="stack" style={{ gap: 6 }}>
                          <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                          <input className="input" value={draft.description} placeholder="Descripción"
                            onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                          <input className="input" value={draft.category} list="cats" placeholder="Categoría"
                            onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                          <input className="input" value={draft.variant} list="variants" placeholder="Tamaño (opcional)"
                            onChange={(e) => setDraft({ ...draft, variant: e.target.value })} />
                        </div>
                      </td>
                      <td>
                        <input className="input" style={{ width: 120 }} inputMode="numeric" value={draft.price}
                          onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
                      </td>
                      <td>
                        <div className="row">
                          <button className="btn btn-primary" onClick={() => saveEdit(p.id)}>Guardar</button>
                          <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id} style={{ opacity: p.available ? 1 : 0.55 }}>
                      <td>
                        <label className="switch" title={p.available ? "Disponible" : "Agotado"}>
                          <input type="checkbox" checked={p.available} onChange={(e) => patch(p.id, { available: e.target.checked })} />
                          <span />
                        </label>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {p.name}
                          {p.variant && <span className="pill pill-accent" style={{ marginLeft: 8 }}>{p.variant}</span>}
                        </div>
                        {p.description && <div className="muted small">{p.description}</div>}
                      </td>
                      <td>{formatCOP(p.price)}</td>
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end" }}>
                          <button className="btn btn-ghost" onClick={() => startEdit(p)}>Editar</button>
                          <button className="btn btn-danger" onClick={() => remove(p)}>Borrar</button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
