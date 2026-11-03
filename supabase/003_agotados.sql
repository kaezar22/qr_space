-- Permite que la barra marque un producto de un pedido como agotado.
-- Ejecútalo una vez en Supabase → SQL Editor ANTES de publicar esta versión.
-- Se puede volver a ejecutar sin problema. (Ya viene incluido en schema.sql.)

alter table order_items add column if not exists unavailable boolean not null default false;
