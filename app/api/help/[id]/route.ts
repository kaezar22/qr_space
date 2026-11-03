import { NextResponse } from "next/server";
import { db, notify } from "@/lib/supabase-server";
import { barTopic, HELP_SELECT } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Estado de un llamado (el id funciona como llave, igual que en los pedidos). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const { data } = await db().from("help_requests").select(HELP_SELECT).eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

/** El cliente cancela su llamado (solo mientras siga pendiente). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await db().from("help_requests").update({ status: "cancelada" }).eq("id", id).eq("status", "pendiente");
  await notify(barTopic, "help_changed");
  return NextResponse.json({ ok: true });
}
