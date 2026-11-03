import { db } from "@/lib/supabase-server";
import type { Product } from "@/lib/types";
import MenuClient from "./MenuClient";

export const dynamic = "force-dynamic";

export default async function MesaPage({ params }: { params: Promise<{ mesa: string }> }) {
  const { mesa } = await params;
  const table = decodeURIComponent(mesa).slice(0, 20);

  const { data, error } = await db()
    .from("products")
    .select("id, name, description, category, variant, price, available, sort")
    .eq("available", true)
    .order("sort")
    .order("name");

  if (error) {
    return (
      <main className="client">
        <div className="card" style={{ marginTop: 40 }}>
          <h2>El menú no está disponible</h2>
          <p className="muted">Intenta de nuevo en un momento o pide directamente en la barra.</p>
        </div>
      </main>
    );
  }

  return (
    <MenuClient
      table={table}
      products={(data ?? []) as Product[]}
      barName={process.env.NEXT_PUBLIC_BAR_NAME || "QR Space"}
    />
  );
}
