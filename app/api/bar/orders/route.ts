import { NextResponse } from "next/server";
import { isBarAuthed } from "@/lib/auth";
import { db } from "@/lib/supabase-server";
import { HELP_SELECT, ORDER_SELECT } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Pedidos activos, los entregados de las últimas 2 horas y los llamados de ayuda abiertos. */
export async function GET() {
  if (!(await isBarAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const [active, done, help] = await Promise.all([
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
    db()
      .from("help_requests")
      .select(HELP_SELECT)
      .eq("status", "pendiente")
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  if (active.error || done.error) return NextResponse.json({ error: "Error" }, { status: 500 });
  return NextResponse.json(
    // Si la tabla de ayuda aún no existe (falta 002_ayuda.sql), los pedidos siguen funcionando.
    { active: active.data, done: done.data, help: help.error ? [] : help.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
