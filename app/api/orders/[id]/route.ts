import { NextResponse } from "next/server";
import { db } from "@/lib/supabase-server";
import { ORDER_SELECT } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Estado de un pedido. El id es un UUID imposible de adivinar: funciona como "llave". */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { data, error } = await db().from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Error" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
