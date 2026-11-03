-- QR Space · esquema de base de datos para Supabase
-- Ejecútalo completo en Supabase → SQL Editor → New query → Run.
-- Se puede volver a ejecutar sin perder datos (actualiza lo que haga falta).
-- Después carga el menú con supabase/menu_soul45.sql.

create extension if not exists pgcrypto;

-- ───────────── Productos (menú) ─────────────
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    text not null default 'Otros',
  price       integer not null check (price >= 0),   -- en pesos (COP), sin decimales
  available   boolean not null default true,
  sort        integer not null default 0,            -- orden en el menú (también ordena las categorías)
  created_at  timestamptz not null default now()
);
-- Tamaño opcional: "Vaso", "Pinta", "Litro", "Trago", "Media", "Botella"...
-- Los productos con el mismo nombre y categoría se muestran juntos en una sola tarjeta.
alter table products add column if not exists variant text;

-- ───────────── Pedidos ─────────────
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  number         bigint generated always as identity,  -- número corto para el bar (#42)
  table_label    text not null,
  customer_name  text not null,
  note           text,
  status         text not null default 'recibido'
                 check (status in ('recibido','preparando','listo','entregado','cancelado')),
  total          integer not null default 0,
  -- Preparado para pagos en línea (Wompi / Mercado Pago):
  payment_status text not null default 'en_barra'
                 check (payment_status in ('en_barra','pendiente','pagado','fallido','reembolsado')),
  payment_method text,
  payment_ref    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  ready_at       timestamptz
);
create index if not exists orders_status_idx on orders (status, created_at);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  name        text not null,        -- copia del nombre (con tamaño) al momento del pedido
  unit_price  integer not null,     -- copia del precio al momento del pedido
  qty         integer not null check (qty > 0)
);
create index if not exists order_items_order_idx on order_items (order_id);
-- La barra puede marcar un producto del pedido como agotado (no se cobra).
alter table order_items add column if not exists unavailable boolean not null default false;

-- ───────────── Llamados de ayuda desde las mesas ─────────────
create table if not exists help_requests (
  id             uuid primary key default gen_random_uuid(),
  table_label    text not null,
  customer_name  text,
  reason         text not null default 'ayuda' check (reason in ('ayuda','dudas','cuenta')),
  status         text not null default 'pendiente' check (status in ('pendiente','atendida','cancelada')),
  created_at     timestamptz not null default now(),
  attended_at    timestamptz
);
create index if not exists help_requests_status_idx on help_requests (status, created_at);

-- ───────────── Seguridad ─────────────
-- RLS activado SIN políticas: el navegador (clave pública) no puede leer ni escribir
-- las tablas. Todo pasa por las rutas /api de Next.js, que usan la clave secreta.
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table help_requests enable row level security;

-- Permisos explícitos (funciona con "Automatically expose new tables" activado o no):
-- solo el servidor (service_role) toca las tablas; anon y authenticated no tienen acceso.
revoke all on products, orders, order_items, help_requests from anon, authenticated;
grant select, insert, update, delete on products, orders, order_items, help_requests to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ───────────── Crear pedido (atómico, precios calculados en el servidor) ─────────────
create or replace function create_order(p_table text, p_name text, p_note text, p_items jsonb)
returns orders
language plpgsql
as $$
declare
  o       orders;
  it      jsonb;
  p       products;
  v_qty   integer;
  v_total integer := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'pedido_vacio';
  end if;

  insert into orders (table_label, customer_name, note)
  values (left(p_table, 20), left(p_name, 40), nullif(left(coalesce(p_note, ''), 200), ''))
  returning * into o;

  for it in select value from jsonb_array_elements(p_items) loop
    select * into p from products
     where id = (it->>'product_id')::uuid and available;
    if not found then
      raise exception 'producto_no_disponible';
    end if;
    v_qty := greatest(1, least(20, coalesce((it->>'qty')::int, 1)));
    insert into order_items (order_id, product_id, name, unit_price, qty)
    values (o.id, p.id, p.name || coalesce(' · ' || nullif(p.variant, ''), ''), p.price, v_qty);
    v_total := v_total + p.price * v_qty;
  end loop;

  update orders set total = v_total where id = o.id returning * into o;
  return o;
end;
$$;

-- Solo el servidor (service_role) puede llamar la función.
revoke execute on function create_order(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function create_order(text, text, text, jsonb) to service_role;
