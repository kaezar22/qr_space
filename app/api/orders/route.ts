import { NextResponse } from "next/server";
import { db, notify } from "@/lib/supabase-server";
import { barTopic } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El cliente crea un pedido. Los precios se calculan en la base de datos. */
export async function POST(req: Request) {
  let body: {
    table?: unknown;
    name?: unknown;
    note?: unknown;
    items?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const table = String(body.table ?? "").trim().slice(0, 20);
  const name = String(body.name ?? "").trim().slice(0, 40);
  const note = String(body.note ?? "").trim().slice(0, 200);
  const items = Array.isArray(body.items) ? body.items : [];

  if (!table) return NextResponse.json({ error: "Falta la mesa" }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ error: "Escribe tu nombre" }, { status: 400 });

  const clean = items
    .map((i) => ({
      product_id: String((i as { product_id?: unknown }).product_id ?? ""),
      qty: Math.max(1, Math.min(20, Math.floor(Number((i as { qty?: unknown }).qty) || 1))),
    }))
    .filter((i) => UUID.test(i.product_id))
    .slice(0, 30);

  if (clean.length === 0) {
    return NextResponse.json({ error: "El pedido está vacío" }, { status: 400 });
  }

  const { data, error } = await db().rpc("create_order", {
    p_table: table,
    p_name: name,
    p_note: note,
    p_items: clean,
  });

  if (error) {
    const unavailable = error.message.includes("producto_no_disponible");
    return NextResponse.json(
      {
        error: unavailable
          ? "Algún producto ya no está disponible. Actualiza el menú."
          : "No pudimos registrar el pedido. Intenta de nuevo.",
      },
      { status: unavailable ? 409 : 500 },
    );
  }

  await notify(barTopic, "orders_changed");
  return NextResponse.json({ id: data.id, number: data.number }, { status: 201 });
}
