-- Llamados de ayuda desde las mesas ("Necesito ayuda", "La cuenta", "Duda del menú").
-- Ejecútalo una vez en Supabase → SQL Editor. Se puede volver a ejecutar sin problema.
-- (Ya viene incluido en schema.sql para instalaciones nuevas.)

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

alter table help_requests enable row level security;
revoke all on help_requests from anon, authenticated;
grant select, insert, update, delete on help_requests to service_role;
