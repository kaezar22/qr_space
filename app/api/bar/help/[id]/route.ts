import { NextResponse } from "next/server";
import { isBarAuthed } from "@/lib/auth";
import { db, notify } from "@/lib/supabase-server";
import { barTopic, helpTopic } from "@/lib/types";

/** La barra responde a un llamado ("Voy"): el cliente ve que alguien va en camino. */
export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isBarAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const { error } = await db()
    .from("help_requests")
    .update({ status: "atendida", attended_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pendiente");
  if (error) return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  await Promise.all([notify(helpTopic(id), "status"), notify(barTopic, "help_changed")]);
  return NextResponse.json({ ok: true });
}
