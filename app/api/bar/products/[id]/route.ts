import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isBarAuthed } from "@/lib/auth";
import { db } from "@/lib/supabase-server";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isBarAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  if ("name" in b) patch.name = String(b.name).trim().slice(0, 60);
  if ("description" in b) patch.description = String(b.description ?? "").trim().slice(0, 200) || null;
  if ("variant" in b) patch.variant = String(b.variant ?? "").trim().slice(0, 20) || null;
  if ("category" in b) patch.category = String(b.category).trim().slice(0, 30) || "Otros";
  if ("price" in b) {
    const price = Math.round(Number(b.price));
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }
    patch.price = price;
  }
  if ("available" in b) patch.available = Boolean(b.available);
  if ("sort" in b) patch.sort = Math.round(Number(b.sort) || 0);

  const { data, error } = await db().from("products").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  revalidatePath("/mesa/[mesa]", "page");
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isBarAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const { error } = await db().from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo borrar" }, { status: 500 });
  revalidatePath("/mesa/[mesa]", "page");
  return NextResponse.json({ ok: true });
}
