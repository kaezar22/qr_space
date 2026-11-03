"use client";

/** Datos que el cliente guarda en su propio celular (nombre y pedidos recientes). */
export interface SavedOrder {
  id: string;
  number: number;
  table: string;
  at: number;
}

const NAME_KEY = "qr_name";
const ORDERS_KEY = "qr_orders";
const MAX_AGE = 8 * 60 * 60 * 1000; // 8 horas

export function getName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}
export function setName(name: string) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* sin almacenamiento */ }
}
export function getOrders(): SavedOrder[] {
  try {
    const list = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as SavedOrder[];
    return list.filter((o) => Date.now() - o.at < MAX_AGE);
  } catch {
    return [];
  }
}
export function saveOrder(order: SavedOrder) {
  try {
    const list = [order, ...getOrders().filter((o) => o.id !== order.id)].slice(0, 10);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
  } catch { /* sin almacenamiento */ }
}

/** Último llamado de ayuda hecho desde este celular. */
const HELP_KEY = "qr_help";
export function getHelpId(table: string): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(HELP_KEY) ?? "null") as { id: string; table: string; at: number } | null;
    return v && v.table === table && Date.now() - v.at < 2 * 60 * 60 * 1000 ? v.id : null;
  } catch {
    return null;
  }
}
export function setHelpId(table: string, id: string | null) {
  try {
    if (id) localStorage.setItem(HELP_KEY, JSON.stringify({ id, table, at: Date.now() }));
    else localStorage.removeItem(HELP_KEY);
  } catch { /* sin almacenamiento */ }
}
