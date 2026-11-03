"use client";

import { useState } from "react";

export default function BarLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/bar/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/bar";
    } else {
      setError((await res.json().catch(() => ({}))).error || "No se pudo entrar");
      setLoading(false);
    }
  }

  return (
    <main className="client" style={{ paddingTop: 70 }}>
      <form className="card stack" onSubmit={submit}>
        <h1 className="display" style={{ fontSize: "1.8rem" }}>Panel del bar</h1>
        <label className="field">
          Contraseña
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary btn-lg" disabled={loading || !password}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
