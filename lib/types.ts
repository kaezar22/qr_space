export type OrderStatus = "recibido" | "preparando" | "listo" | "entregado" | "cancelado";
export type PaymentStatus = "en_barra" | "pendiente" | "pagado" | "fallido" | "reembolsado";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  variant: string | null;
  price: number;
  available: boolean;
  sort: number;
}

export interface OrderItem {
  id: string;
  name: string;
  unit_price: number;
  qty: number;
  unavailable: boolean;
}

export interface Order {
  id: string;
  number: number;
  table_label: string;
  customer_name: string;
  note: string | null;
  status: OrderStatus;
  total: number;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
  order_items: OrderItem[];
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  recibido: "Recibido",
  preparando: "Preparando",
  listo: "¡Listo!",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ORDER_SELECT =
  "id, number, table_label, customer_name, note, status, total, payment_status, created_at, updated_at, ready_at, order_items(id, name, unit_price, qty, unavailable)";

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formato corto de la carta: 36500 → "$36.5K", 186000 → "$186K". */
export function formatK(value: number): string {
  if (value < 1000) return `$${value}`;
  const k = value / 1000;
  return `$${Number.isInteger(k) ? k : k.toFixed(1).replace(/\.0$/, "")}K`;
}

/** Nombre que se muestra en carrito y pedidos: "Amber Ale · Pinta". */
export function productLabel(p: { name: string; variant: string | null }): string {
  return p.variant ? `${p.name} · ${p.variant}` : p.name;
}

export type HelpReason = "ayuda" | "dudas" | "cuenta";
export type HelpStatus = "pendiente" | "atendida" | "cancelada";

export interface HelpRequest {
  id: string;
  table_label: string;
  customer_name: string | null;
  reason: HelpReason;
  status: HelpStatus;
  created_at: string;
  attended_at: string | null;
}

export const HELP_REASONS: { value: HelpReason; label: string; hint: string; icon: string }[] = [
  { value: "ayuda", label: "Necesito atención", hint: "Alguien del bar se acerca a tu mesa", icon: "🙋" },
  { value: "dudas", label: "Tengo una duda del menú", hint: "Te explicamos lo que quieras", icon: "💬" },
  { value: "cuenta", label: "Quiero la cuenta", hint: "Te llevamos el total para pagar", icon: "🧾" },
];
export const HELP_LABEL: Record<HelpReason, string> = {
  ayuda: "Necesita atención",
  dudas: "Duda del menú",
  cuenta: "Pide la cuenta",
};
export const HELP_SELECT = "id, table_label, customer_name, reason, status, created_at, attended_at";
export const helpTopic = (id: string) => `help-${id}`;

export const barTopic = "bar";
export const orderTopic = (id: string) => `order-${id}`;
