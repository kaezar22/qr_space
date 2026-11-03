# QR Space · pedidos por QR para bares

El cliente escanea el QR de su mesa, elige del menú, escribe su nombre y pide. El bar ve el
pedido al instante, lo prepara y lo marca como **listo**: el celular del cliente suena, vibra y
muestra el aviso.

- **Stack:** Next.js 16 (App Router) en **Vercel** + **Supabase** (Postgres + Realtime).
- **Cliente:** `/mesa/<mesa>` → menú y carrito · `/pedido/<id>` → estado en vivo.
- **Bar:** `/bar` → tablero de pedidos · `/bar/menu` → productos y agotados · `/bar/qr` → QR para imprimir.
- **Marca:** colores en `app/globals.css` (`:root`), tipografías de la carta (Cinzel, Oswald, Open Sans) en `app/layout.tsx`,
  dirección y notas por categoría en `lib/brand.ts`. Los productos con el mismo nombre y distinto tamaño
  (vaso/pinta/litro, trago/media/botella) se muestran en una sola tarjeta.

```
Cliente (celular)                 Vercel (Next.js)                  Supabase
  /mesa/7  ── POST /api/orders ──▶  valida, llama create_order() ──▶  orders, order_items
                                   avisa al canal "bar" ───────────▶  Realtime (broadcast)
  Bar /bar ◀── aviso "orders_changed" ─────────────────────────────── Realtime
  Bar marca "listo" ─ PATCH ─────▶  actualiza estado ──────────────▶  orders
                                   avisa al canal "order-<id>" ────▶  Realtime
  /pedido/<id> ◀── aviso → vuelve a consultar → 🔔 sonido + vibración + notificación
```

---

## 1. Crear la base de datos en Supabase (5 min)

1. Entra a <https://supabase.com> y crea un proyecto en la región **East US (North Virginia)**, la misma donde Vercel ejecuta las funciones por defecto.
   Deja **Enable Data API** activado, desmarca **Automatically expose new tables** y marca **Enable automatic RLS**.
2. Ve a **SQL Editor → New query**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**.
   Esto crea las tablas, la función de pedidos y la seguridad. Se puede volver a ejecutar sin perder datos.
   Luego, en otra query, ejecuta [`supabase/menu_soul45.sql`](supabase/menu_soul45.sql) para cargar la carta de Soul45
   (reemplaza todo el menú; los pedidos no se tocan).
3. Ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - la clave **anon / publishable** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - la clave **service_role / secret** → `SUPABASE_SERVICE_ROLE_KEY` (¡secreta!)
4. En **Realtime → Settings**, deja activado **"Allow public access"** (los canales de aviso son públicos pero no llevan datos).

## 2. Probar en tu computador

```bash
npm install
copy .env.example .env.local      # en Windows (en Mac/Linux: cp)
# llena .env.local con los datos de Supabase y una contraseña para el bar
npm run dev
```

- Cliente: <http://localhost:3000/mesa/1>
- Bar: <http://localhost:3000/bar> (usa `BAR_PASSWORD`)

Tip: abre el bar en el computador y el cliente en otra ventana para ver el flujo completo.

## 3. Desplegar en Vercel

1. Sube el proyecto a GitHub:
   ```bash
   git init
   git add .
   git commit -m "QR Space: primera versión"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/qr_space.git
   git push -u origin main
   ```
2. En <https://vercel.com/new> importa el repositorio (Vercel detecta Next.js solo).
3. En **Environment Variables** carga las 6 variables de `.env.example`.
   Para `BAR_SESSION_SECRET` usa un texto largo aleatorio.
4. **Deploy.** Cada `git push` a `main` vuelve a desplegar automáticamente.
5. (Opcional) En **Settings → Domains** conecta tu dominio, por ejemplo `pedidos.tubar.com`.

## 4. Imprimir los QR

Entra a `/bar/qr` **desde la dirección final** (tu dominio o la de Vercel). Escribe las mesas
(`1-15`, o `1-10, Barra, Terraza 1`) y dale **Imprimir**. Cada QR abre `/<dominio>/mesa/<mesa>`.

> Define el dominio definitivo antes de imprimir: si la dirección cambia, hay que reimprimir.

---

## Cómo funciona el aviso de "pedido listo"

| Situación del cliente | ¿Se entera? |
|---|---|
| Página del pedido abierta | ✅ Sonido, vibración (Android), tarjeta verde y título parpadeante |
| Cambió a otra app (Android, avisos activados) | ✅ Notificación del sistema mientras el navegador siga vivo |
| iPhone en otra app / pantalla bloqueada | ⚠️ Solo al volver a la página (iOS limita las notificaciones web) |
| Cerró el navegador | ❌ Necesita Web Push (ver abajo) |

El cliente ve el botón **"Activar avisos"** después de pedir. La app usa Supabase Realtime y,
como respaldo, vuelve a consultar cada 12 segundos y cada vez que el cliente regresa a la pestaña.

### Siguiente paso: notificaciones con la app cerrada (Web Push)

El service worker (`public/sw.js`) ya está listo para recibir push. Para activarlo:

1. Generar llaves VAPID (`npx web-push generate-vapid-keys`) y guardarlas como variables de entorno.
2. Crear la tabla `push_subscriptions (order_id, endpoint, p256dh, auth)`.
3. En `/pedido/<id>`, al tocar "Activar avisos", hacer `registration.pushManager.subscribe(...)` y enviar la suscripción a una ruta `/api/push/subscribe`.
4. En `PATCH /api/bar/orders/[id]`, cuando el estado pase a `listo`, enviar el push con la librería `web-push`.

En iPhone, Web Push solo funciona si el cliente **agrega la página a la pantalla de inicio**, así que
para iOS el aviso en pantalla sigue siendo lo principal.

---

## Medio de pago (preparado para después)

Hoy el pago se hace **en la barra** y el bartender marca cada pedido como *Pagado / Por cobrar*.
La tabla `orders` ya tiene `payment_status`, `payment_method` y `payment_ref` para conectar una pasarela.

**Opciones recomendadas para Colombia:**

| Pasarela | Métodos | Notas |
|---|---|---|
| **Wompi** (Bancolombia) | Nequi, PSE, tarjetas, Bancolombia, QR | Muy usada en Colombia, buena documentación, widget de checkout |
| **Mercado Pago** | Tarjetas, PSE, efectivo | Checkout Pro fácil de integrar |
| **ePayco** | Tarjetas, PSE, Daviplata, efectivo | Alternativa local |

**Flujo propuesto (con Wompi como ejemplo):**

1. El cliente elige *"Pagar ahora"* en el carrito → el pedido se crea con `payment_status = 'pendiente'`.
2. El servidor genera la referencia y la **firma de integridad** (`referencia + monto + moneda + secreto`) y abre el widget de Wompi.
3. Wompi llama a un webhook `POST /api/payments/webhook` → se verifica la firma del evento → `payment_status = 'pagado'` y se avisa al bar.
4. El bar solo empieza a preparar los pedidos en línea cuando ya están pagados (los de "pagar en barra" siguen igual).

Reglas importantes: el monto **siempre** se calcula en el servidor (ya es así: lo hace `create_order`),
y el pedido se marca pagado **solo por el webhook verificado**, nunca porque el navegador lo diga.

---

## Seguridad (resumen)

- Las tablas tienen RLS activado **sin políticas**: con la clave pública nadie puede leer ni escribir pedidos.
- Todo pasa por las rutas `/api`, que usan la clave secreta solo en el servidor.
- Los precios y totales los calcula la base de datos; el navegador solo envía ids y cantidades.
- El estado de cada pedido se consulta con su UUID, que es imposible de adivinar.
- El panel del bar usa una cookie firmada (HMAC) con duración de 14 horas.
- Los avisos de Realtime no llevan datos: solo dicen "vuelve a consultar".

## Estructura

```
app/
  mesa/[mesa]/       menú y carrito del cliente
  pedido/[id]/       estado del pedido en vivo
  bar/               tablero (Nuevos → Preparando → Listos)
  bar/menu/          productos, precios, agotados
  bar/qr/            generador e impresión de QR
  api/orders/        crear pedido / consultar estado (público)
  api/bar/...        login, pedidos y productos (protegido)
lib/                 Supabase, sesión del bar, tipos, utilidades
public/sw.js         service worker (notificaciones / futuro push)
supabase/schema.sql  base de datos completa
```
