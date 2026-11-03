import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isBarAuthed } from "@/lib/auth";
import { db } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isBarAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await db()
    .from("products")
    .select("*")
    .order("sort")
    .order("name");
  if (error) return NextResponse.json({ error: "Error" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await isBarAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().slice(0, 60);
  const price = Math.round(Number(b.price));
  if (!name || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Nombre y precio son obligatorios" }, { status: 400 });
  }
  const category = String(b.category ?? "").trim().slice(0, 30) || "Otros";

  // Sin orden explícito: va al final de su categoría (o al final del menú si es nueva).
  let sort = Math.round(Number(b.sort));
  if (!Number.isFinite(sort) || !("sort" in b)) {
    const { data: last } = await db()
      .from("products")
      .select("sort, category")
      .order("sort", { ascending: false });
    const inCat = last?.find((p) => p.category === category);
    sort = (inCat?.sort ?? last?.[0]?.sort ?? 0) + 1;
  }

  const { data, error } = await db()
    .from("products")
    .insert({
      name,
      price,
      category,
      sort,
      variant: String(b.variant ?? "").trim().slice(0, 20) || null,
      description: String(b.description ?? "").trim().slice(0, 200) || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: "No se pudo crear" }, { status: 500 });
  revalidatePath("/mesa/[mesa]", "page");
  return NextResponse.json(data, { status: 201 });
}
