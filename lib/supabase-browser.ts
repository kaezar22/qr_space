"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";

let client: SupabaseClient | null | undefined;

function browserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

/**
 * Llama a `onSignal` cada vez que llega un aviso al canal, y además cada
 * `pollMs` milisegundos como respaldo (por si el celular perdió la conexión).
 * Devuelve si el tiempo real está activo.
 */
export function useLiveRefresh(topic: string | null, onSignal: () => void, pollMs = 15000) {
  const cb = useRef(onSignal);
  cb.current = onSignal;

  useEffect(() => {
    if (!topic) return;
    const sb = browserClient();
    const fire = () => cb.current();
    fire(); // carga inicial inmediata, sin esperar a que conecte el tiempo real

    const channel = sb
      ?.channel(topic)
      .on("broadcast", { event: "*" }, fire)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") fire();
      });

    // Sin tiempo real, se consulta más seguido.
    const interval = setInterval(fire, sb ? pollMs : 4000);
    const onVisible = () => document.visibilityState === "visible" && fire();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", fire);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", fire);
      if (sb && channel) sb.removeChannel(channel);
    };
  }, [topic, pollMs]);
}

/** Pitido corto con Web Audio (no requiere archivos de sonido). */
export function beep(times = 2) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.28;
      osc.frequency.value = i % 2 ? 1175 : 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    }
    setTimeout(() => ctx.close(), times * 300 + 200);
  } catch {
    /* sin audio disponible */
  }
}
