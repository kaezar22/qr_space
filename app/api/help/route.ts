import { NextResponse } from "next/server";
import { db, notify } from "@/lib/supabase-server";
import { barTopic, HELP_SELECT, type HelpReason } from "@/lib/types";

export const dynamic = "force-dynamic";

const REASONS: HelpReason[] = ["ayuda", "dudas", "cuenta"];

/**
 * Una mesa pide ayuda. Si esa mesa ya tiene un llamado abierto, se actualiza
 * (y se vuelve a avisar) en lugar de crear otro: así la barra no se llena de repetidos.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { table?: unknown; name?: unknown; reason?: unknown };
  const table = String(b.table ?? "").trim().slice(0, 20);
  const name = String(b.name ?? "").trim().slice(0, 40) || null;
  const reason = REASONS.includes(b.reason as HelpReason) ? (b.reason as HelpReason) : "ayuda";
  if (!table) return NextResponse.json({ error: "Falta la mesa" }, { status: 400 });

  const { data: open } = await db()
    .from("help_requests")
    .select("id")
    .eq("table_label", table)
    .eq("status", "pendiente")
    .limit(1)
    .maybeSingle();

  const result = open
    ? await db().from("help_requests").update(name ? { reason, customer_name: name } : { reason }).eq("id", open.id).select(HELP_SELECT).single()
    : await db().from("help_requests").insert({ table_label: table, customer_name: name, reason }).select(HELP_SELECT).single();

  if (result.error) return NextResponse.json({ error: "No pudimos avisar a la barra. Intenta de nuevo." }, { status: 500 });

  await notify(barTopic, "help_changed");
  return NextResponse.json(result.data, { status: open ? 200 : 201 });
}
