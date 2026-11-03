import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const BAR_COOKIE = "bar_session";
export const BAR_COOKIE_MAX_AGE = 60 * 60 * 14; // 14 horas: un turno largo

function expectedToken(): string | null {
  const password = process.env.BAR_PASSWORD;
  const secret = process.env.BAR_SESSION_SECRET;
  if (!password || !secret) return null;
  return createHmac("sha256", secret).update(`bar:${password}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function checkPassword(input: string): string | null {
  const password = process.env.BAR_PASSWORD;
  const token = expectedToken();
  if (!password || !token) return null;
  return safeEqual(input, password) ? token : null;
}

export async function isBarAuthed(): Promise<boolean> {
  const token = expectedToken();
  if (!token) return false;
  const value = (await cookies()).get(BAR_COOKIE)?.value;
  return !!value && safeEqual(value, token);
}
