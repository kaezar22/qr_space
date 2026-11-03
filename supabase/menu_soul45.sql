-- Menú de Soul45 (transcrito de nuevo_menú_soul.pdf)
-- Ejecútalo en Supabase → SQL Editor DESPUÉS de schema.sql.
-- ⚠️ Reemplaza TODO el menú actual. Los pedidos ya hechos no se pierden.
--
-- Precios en pesos. "sort" define el orden: comida (100s), cervezas (200s),
-- cócteles (300s), licores (400s), bebidas (500s). Los productos con el mismo
-- nombre y distinto "variant" (tamaño) se muestran en una sola tarjeta.

begin;

-- Por si schema.sql no se ha vuelto a ejecutar: asegura la columna de tamaño.
alter table products add column if not exists variant text;

delete from products;

insert into products (category, name, variant, description, price, sort) values
-- ───────── COMIDA · cocina hasta 11:30 p. m. ─────────
('Comida', 'Hamburguesa Soul',      null, '2 mini hamburguesas de carne, queso, tocineta, lechuga, cebolla, tomate y salsa de la casa. Acompañadas con papas a la francesa.', 36500, 101),
('Comida', 'Nachos',                null, '140 g de nachos, carne molida, chorizo, guacamole, pico de gallo, sour cream, queso cheddar y jalapeños.', 40000, 102),
('Comida', 'Chicharrones',          null, '250 g de tocino, papas chips y plátanos chips con acompañamiento de guacamole y limón.', 32000, 103),
('Comida', 'Empanadas',             null, 'Empanadas de carne y pollo x 5 unidades, acompañadas con salsa de la casa.', 23000, 104),
('Comida', 'Papa bacon',            null, '500 g de papas a la francesa bañadas en salsa cheddar, tocineta y cebollín.', 20000, 105),
('Comida', 'Tacos',                 null, 'Tacos x 3 unidades, pico de gallo, jalapeño, guacamole y carne.', 31000, 106),
('Comida', 'Bowl plátanos chips',   null, '250 g de plátanos chips con salsa de ajo o de la casa.', 12500, 107),

-- ───────── CERVEZA DE LA CASA · DECIBEL ─────────
('Cerveza de la casa', 'Amber Ale', 'Vaso',  'Alc. 4.7% · IBU 26 — Color ámbar con sabor a maltas caramelo, con tonos dulces y suave amargor.', 17000, 201),
('Cerveza de la casa', 'Amber Ale', 'Pinta', 'Alc. 4.7% · IBU 26 — Color ámbar con sabor a maltas caramelo, con tonos dulces y suave amargor.', 21000, 202),
('Cerveza de la casa', 'Amber Ale', 'Litro', 'Alc. 4.7% · IBU 26 — Color ámbar con sabor a maltas caramelo, con tonos dulces y suave amargor.', 36000, 203),
('Cerveza de la casa', 'Pale Ale',  'Vaso',  'Alc. 4.5% · IBU 35 — Color dorado a ámbar claro, con aromas a lúpulos florales y maltas ligeras.', 17000, 211),
('Cerveza de la casa', 'Pale Ale',  'Pinta', 'Alc. 4.5% · IBU 35 — Color dorado a ámbar claro, con aromas a lúpulos florales y maltas ligeras.', 21000, 212),
('Cerveza de la casa', 'Pale Ale',  'Litro', 'Alc. 4.5% · IBU 35 — Color dorado a ámbar claro, con aromas a lúpulos florales y maltas ligeras.', 36000, 213),
('Cerveza de la casa', 'IPA',       'Vaso',  'Alc. 6% · IBU 50 — Color cobrizo con aromas a lúpulo intenso, notas cítricas, pinosas y maltas caramelo.', 19000, 221),
('Cerveza de la casa', 'IPA',       'Pinta', 'Alc. 6% · IBU 50 — Color cobrizo con aromas a lúpulo intenso, notas cítricas, pinosas y maltas caramelo.', 24000, 222),
('Cerveza de la casa', 'IPA',       'Litro', 'Alc. 6% · IBU 50 — Color cobrizo con aromas a lúpulo intenso, notas cítricas, pinosas y maltas caramelo.', 42000, 223),
('Cerveza de la casa', 'Smoked Rye Porter (Bruja Negra)', 'Vaso',  'Alc. 7.8% · IBU 35 — Color marrón oscuro. Aromas a notas ahumadas, robles y centeno ahumado.', 19000, 231),
('Cerveza de la casa', 'Smoked Rye Porter (Bruja Negra)', 'Pinta', 'Alc. 7.8% · IBU 35 — Color marrón oscuro. Aromas a notas ahumadas, robles y centeno ahumado.', 24000, 232),
('Cerveza de la casa', 'Smoked Rye Porter (Bruja Negra)', 'Litro', 'Alc. 7.8% · IBU 35 — Color marrón oscuro. Aromas a notas ahumadas, robles y centeno ahumado.', 42000, 233),
('Cerveza de la casa', 'Cerveza invitada (La Pole)', 'Vaso', 'Cerveza Lager Bohemian, Rye, Dark.', 17000, 241),

-- ───────── CÓCTELES ─────────
('Cócteles', 'Gin tonic',    null, 'Ginebra, pepino, romero, limón y tónica.', 39000, 301),
('Cócteles', 'Mojito',       null, 'Ron, hierbabuena y limón.',                37000, 302),
('Cócteles', 'Tangarine',    null, 'Ginebra, jugo de naranja, granadina.',     39000, 303),
('Cócteles', 'Tinto verano', null, 'Vino tinto, Sprite y naranja.',            35000, 304),
('Cócteles', 'Copa de vino', null, null,                                        30000, 305),

-- ───────── LICORES · trago / media / botella ─────────
('Licores', 'Jack Daniel''s',        'Trago', null,  32000, 401),
('Licores', 'Jack Daniel''s',        'Media', null, 186000, 402),
('Licores', 'Jack Daniel''s',        'Botella', null, 384000, 403),
('Licores', 'Jameson',               'Trago', null,  28000, 411),
('Licores', 'Jameson',               'Media', null, 180000, 412),
('Licores', 'Jameson',               'Botella', null, 360000, 413),
('Licores', 'Glenfiddich',           'Trago', null,  40000, 421),
('Licores', 'Glenfiddich',           'Media', null, 246000, 422),
('Licores', 'Glenfiddich',           'Botella', null, 480000, 423),
('Licores', 'Ron Viejo de Caldas',   'Trago', null,  19000, 431),
('Licores', 'Ron Viejo de Caldas',   'Media', null,  91000, 432),
('Licores', 'Ron Viejo de Caldas',   'Botella', null, 192000, 433),
('Licores', 'José Cuervo',           'Trago', null,  29000, 441),
('Licores', 'José Cuervo',           'Media', null, 168000, 442),
('Licores', 'José Cuervo',           'Botella', null, 327000, 443),
('Licores', 'Jimador',               'Trago', null,  31000, 451),
('Licores', 'Jimador',               'Media', null, 180000, 452),
('Licores', 'Jimador',               'Botella', null, 348000, 453),
('Licores', 'Antioqueño',            'Trago', null,  13200, 461),
('Licores', 'Antioqueño',            'Media', null,  87000, 462),
('Licores', 'Antioqueño',            'Botella', null, 186000, 463),
('Licores', 'Gordon''s',             'Trago', null,  27600, 471),
('Licores', 'Gordon''s',             'Botella', null, 250000, 473),
('Licores', 'Absolut',               'Trago', null,  28800, 481),
('Licores', 'Absolut',               'Media', null, 150000, 482),
('Licores', 'Absolut',               'Botella', null, 284000, 483),
('Licores', 'Jägermeister',          'Trago', null,  30000, 491),
('Licores', 'Jägermeister',          'Media', null, 162000, 492),
('Licores', 'Jägermeister',          'Botella', null, 324000, 493),
('Licores', 'Aguardiente Amarillo',  'Trago', null,  13200, 495),
('Licores', 'Aguardiente Amarillo',  'Media', null,  87000, 496),
('Licores', 'Aguardiente Amarillo',  'Botella', null, 186000, 497),

-- ───────── BEBIDAS ─────────
('Bebidas', 'Coca-Cola',          null, null, 10000, 501),
('Bebidas', 'Bretaña',            null, null, 10500, 502),
('Bebidas', 'Bretaña con limón',  null, null, 11000, 503),
('Bebidas', 'Agua',               null, null,  8000, 504),
('Bebidas', 'Agua tónica',        null, null, 10000, 505),
('Bebidas', 'Vaso michelado',     null, null,  3000, 506);

commit;
