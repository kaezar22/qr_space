import { NextResponse } from "next/server";
import { isBarAuthed } from "@/lib/auth";
import { db } from "@/lib/supabase-server";
import { ORDER_SELECT } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Pedidos activos + los entregados de las últimas 2 horas. */
export async function GET() {
  if (!(await isBarAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const [active, done] = await Promise.all([
    db()
      .from("orders")
      .select(ORDER_SELECT)
      .in("status", ["recibido", "preparando", "listo"])
      .order("created_at", { ascending: true })
      .limit(200),
    db()
      .from("orders")
      .select(ORDER_SELECT)
      .in("status", ["entregado", "cancelado"])
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  if (active.error || done.error) return NextResponse.json({ error: "Error" }, { status: 500 });
  return NextResponse.json(
    { active: active.data, done: done.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
