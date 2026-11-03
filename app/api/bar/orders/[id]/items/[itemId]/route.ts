import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isBarAuthed } from "@/lib/auth";
import { db, notify } from "@/lib/supabase-server";
import { barTopic, orderTopic } from "@/lib/types";

/**
 * La barra marca (o desmarca) un producto del pedido como agotado.
 * - El total se recalcula sin los productos agotados.
 * - Con hideProduct, el producto se oculta del menú en todos sus tamaños
 *   (si se acabó el Jack Daniel's, no hay trago, media ni botella).
 * - Si todo el pedido queda agotado, se cancela.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  if (!(await isBarAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, itemId } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as { unavailable?: boolean; hideProduct?: boolean };
  const unavailable = b.unavailable !== false;

  const { data: item, error } = await db()
    .from("order_items")
    .update({ unavailable })
    .eq("id", itemId)
    .eq("order_id", id)
    .select("product_id")
    .single();
  if (error || !item) return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });

  const { data: items } = await db().from("order_items").select("unit_price, qty, unavailable").eq("order_id", id);
  const available = (items ?? []).filter((i) => !i.unavailable);
  const total = available.reduce((s, i) => s + i.unit_price * i.qty, 0);

  const patch: Record<string, unknown> = { total, updated_at: new Date().toISOString() };
  if (available.length === 0) patch.status = "cancelado";
  await db().from("orders").update(patch).eq("id", id);

  if (unavailable && b.hideProduct && item.product_id) {
    const { data: product } = await db().from("products").select("name, category").eq("id", item.product_id).maybeSingle();
    if (product) {
      await db().from("products").update({ available: false }).eq("name", product.name).eq("category", product.category);
      revalidatePath("/mesa/[mesa]", "page");
    }
  }

  await Promise.all([notify(orderTopic(id), "status"), notify(barTopic, "orders_changed")]);
  return NextResponse.json({ ok: true, total, cancelled: available.length === 0 });
}
