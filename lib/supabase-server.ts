import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Cliente con la clave secreta. Solo se usa en el servidor (rutas /api y páginas). */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * Envía un aviso en tiempo real (Supabase Broadcast).
 * El aviso no lleva datos: quien lo recibe vuelve a pedir la información a /api,
 * así nadie puede falsificar un estado enviando mensajes al canal.
 */
export async function notify(topic: string, event: string): Promise<void> {
  try {
    const channel = db().channel(topic);
    await channel.httpSend(event, { at: Date.now() }, { timeout: 4000 });
    await db().removeChannel(channel);
  } catch (err) {
    console.error("notify failed", topic, err);
  }
}
