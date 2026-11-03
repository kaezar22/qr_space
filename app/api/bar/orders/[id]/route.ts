import { NextResponse } from "next/server";
import { isBarAuthed } from "@/lib/auth";
import { db, notify } from "@/lib/supabase-server";
import { barTopic, orderTopic, type OrderStatus, type PaymentStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["recibido", "preparando", "listo", "entregado", "cancelado"];
const PAYMENTS: PaymentStatus[] = ["en_barra", "pendiente", "pagado", "fallido", "reembolsado"];

/** El bar cambia el estado del pedido (y opcionalmente el estado de pago). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isBarAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { status?: string; payment_status?: string };

  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (body.status) {
    if (!STATUSES.includes(body.status as OrderStatus)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === "listo") patch.ready_at = patch.updated_at;
  }
  if (body.payment_status) {
    if (!PAYMENTS.includes(body.payment_status as PaymentStatus)) {
      return NextResponse.json({ error: "Pago inválido" }, { status: 400 });
    }
    patch.payment_status = body.payment_status;
  }

  const { error } = await db().from("orders").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });

  await Promise.all([notify(orderTopic(id), "status"), notify(barTopic, "orders_changed")]);
  return NextResponse.json({ ok: true });
}
