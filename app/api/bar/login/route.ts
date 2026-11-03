import { NextResponse } from "next/server";
import { BAR_COOKIE, BAR_COOKIE_MAX_AGE, checkPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const token = checkPassword(String(password ?? ""));
  if (!token) {
    await new Promise((r) => setTimeout(r, 600)); // frena intentos de fuerza bruta
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BAR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BAR_COOKIE_MAX_AGE,
  });
  return res;
}
