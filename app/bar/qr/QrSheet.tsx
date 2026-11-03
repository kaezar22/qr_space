"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

function parseTables(input: string): string[] {
  // Acepta "1-12", "1,2,3", "Terraza 1, Barra" o combinaciones: "1-10, VIP, Barra"
  const out: string[] = [];
  for (const part of input.split(",").map((s) => s.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y);
      for (let i = a; i <= Math.min(b, a + 199); i++) out.push(String(i));
    } else {
      out.push(part.slice(0, 20));
    }
  }
  return [...new Set(out)];
}

export default function QrSheet({ barName }: { barName: string }) {
  const [base, setBase] = useState("");
  const [tablesInput, setTablesInput] = useState("1-12");
  const [codes, setCodes] = useState<{ table: string; url: string; img: string }[]>([]);

  useEffect(() => setBase(window.location.origin), []);
  const tables = useMemo(() => parseTables(tablesInput), [tablesInput]);

  useEffect(() => {
    if (!base) return;
    let cancelled = false;
    const root = base.replace(/\/+$/, "");
    Promise.all(
      tables.map(async (table) => {
        const url = `${root}/mesa/${encodeURIComponent(table)}`;
        const img = await QRCode.toDataURL(url, { width: 600, margin: 1, errorCorrectionLevel: "M" });
        return { table, url, img };
      }),
    ).then((list) => !cancelled && setCodes(list));
    return () => { cancelled = true; };
  }, [base, tables]);

  return (
    <div className="stack">
      <div className="card stack no-print">
        <h1 className="display" style={{ fontSize: "1.8rem" }}>Códigos QR por mesa</h1>
        <div className="row wrap">
          <label className="field grow" style={{ minWidth: 240 }}>
            Mesas (rango o lista)
            <input className="input" value={tablesInput} onChange={(e) => setTablesInput(e.target.value)} placeholder="1-12, Barra, Terraza 1" />
          </label>
          <label className="field grow" style={{ minWidth: 240 }}>
            Dirección de la app
            <input className="input" value={base} onChange={(e) => setBase(e.target.value)} />
          </label>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Usa la dirección final de Vercel (o tu dominio) antes de imprimir: si cambia, hay que reimprimir.
        </p>
        <div><button className="btn btn-primary" onClick={() => window.print()}>Imprimir {codes.length} códigos</button></div>
      </div>

      <div className="qr-grid">
        {codes.map((c) => (
          <div key={c.table} className="qr-card">
            <div className="h">{barName}</div>
            <div className="t">Mesa {c.table}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.img} alt={`QR mesa ${c.table}`} />
            <div className="h">Escanea, pide y te avisamos cuando esté listo</div>
          </div>
        ))}
      </div>
    </div>
  );
}
