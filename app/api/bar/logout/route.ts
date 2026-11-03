import { NextResponse } from "next/server";
import { BAR_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BAR_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
