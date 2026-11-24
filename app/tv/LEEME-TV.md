# Pantalla del local (`/tv`)

Bucle a pantalla completa para la tele de la carnicería: marca → ofertas → video
"cómo pedir" → destacados → combos → video "pago con Talo" → pausa con el QR.

- Se activa con `TV_ENABLED=true` en el `.env` del servidor y `pm2 restart carniceria`.
  Con cualquier otro valor, `/tv`, `/api/tv/data` y `/tv/manifest.webmanifest` dan 404.
- Los datos salen de `GET /api/tv/data` (solo campos públicos), se refrescan cada
  60 s y, si falla la red, la pantalla sigue con lo último que tenía.
- Ofertas, destacados (los marcados como "Destacado" en el admin) y combos se
  muestran de a uno; en cada vuelta arranca por otro producto. Los agotados no salen.
  Si una sección no tiene productos, se saltea.
- La página se recarga sola cada ~3 h (solo si el servidor responde).

## Fotos de los productos

Son exactamente las mismas que muestra la tienda: el campo `image` del producto
(`imageUrl` en combos). Cuando el cliente sube una foto desde el admin, se guarda
en **Cloudinary** (`lib/uploads/upload-images.ts`) y en la base queda la URL
`https://res.cloudinary.com/dku7noipe/...`. La tienda (`components/product-card.tsx`)
y la tele la pasan tal cual a `next/image`, que la optimiza vía `/_next/image`
(permitida en `images.remotePatterns` de `next.config.js`).

- No dependen de `public/` ni del VPS: un producto nuevo se ve sin rebuild ni deploy.
- El logo aparece en lugar de la foto solo si el producto no tiene imagen o si la
  URL falla.

## Tiempos

Todos están en el objeto `TIMING`, al principio de `TvClient.tsx`:

| Qué | Tiempo |
|-----|--------|
| Slide de marca | 12 s |
| Cada producto (ofertas, destacados, combos) | 14 s |
| Grilla de ofertas | 16 s |
| Entrada de cada elemento (foto, textos, precio) | 1,8 s, easing suave |
| Escalonado entre elementos | 250 ms |
| Salida del slide | 0,9 s |
| Pausa con el QR | `?qr=` (90 s por defecto) |

El texto de cada producto termina de entrar a los ~2,8 s y queda quieto unos 10 s
antes de la salida. La barra roja y los puntos siguen estos valores.

Para ajustarlos en la tele sin tocar código: `?t=1.5` multiplica todos los tiempos
(slides, entradas, salidas, escalonado). En producción acepta de 1 a 3 (solo puede
enlentecer); en desarrollo, de 0,5 a 3. La pausa del QR no se multiplica: se
ajusta con `?qr=`.

## Parámetros de la URL

| Parámetro | Qué hace | En producción |
|-----------|----------|---------------|
| `?qr=90`  | Segundos de la pausa con el QR (10 a 1800, por defecto 90) | Sí |
| `?fs=0`   | No pide pantalla completa ni muestra el cartel "Presioná OK" | Sí |
| `?t=1.5`  | Multiplica todos los tiempos (por defecto 1) | Sí, de 1 a 3 (en desarrollo de 0,5 a 3) |
| `?debug`  | Muestra slide, paso, `t`, escala y medidas de la ventana arriba a la izquierda | Se ignora |
| `?mock=1` | Productos de ejemplo para ver el diseño con la base vacía (fotos reales del Cloudinary del cliente, precios inventados) | Se ignora (ni siquiera está en el build) |

## Probar en la tele por HDMI

1. **Usá el build de producción**, no `npm run dev`: en desarrollo Next muestra su
   ícono y, ante cualquier error (aunque no sea de `/tv`), un overlay rojo que tapa
   la pantalla.

   ```
   npm run build
   npm start
   ```

   Con `TV_ENABLED=true` en el entorno local. `npm start` usa el puerto 3000 salvo
   que indiques otro (`npm start -- -p 3100`); ajustá la URL de abajo al puerto real.

2. Conectá la tele por HDMI y en Windows elegí **Extender** estas pantallas
   (`Win + P`). En Configuración → Pantalla fijate en qué lado quedó la tele y el
   ancho en píxeles de la pantalla principal.

3. Abrí Chrome en modo kiosco en la tele (Win + R o una terminal `cmd`):

   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --user-data-dir="%TEMP%\tvkiosk" --window-position=<X>,0 "http://localhost:3100/tv"
   ```

   - `<X>` es el ancho de la pantalla principal si la tele está a la derecha (por
     ejemplo `1920`). Si la tele está a la izquierda, usá un número negativo con el
     ancho de la tele (por ejemplo `-1920`).
   - `--user-data-dir` hace que se abra **una instancia nueva** de Chrome, separada de
     la que ya tenés abierta. Sin eso, Chrome abre una ventana común en tu sesión y
     el `--kiosk` no se aplica.
   - Para salir: **Alt + F4** (con la ventana de la tele activa).
   - Agregá `?fs=0` a la URL si no querés ver el cartel "Presioná OK".
   - Para revisar escala y medidas, agregá `&debug`. Solo funciona en desarrollo:
     en producción ese parámetro se ignora.

**No verificado sin la tele real:** que la ventana quede exactamente en la tele con
ese `--window-position`, la resolución que informa la tele por HDMI, el overscan
(si recorta los bordes) y el escalado de Windows para esa pantalla. Si la tele
informa 1920x1080 y el escalado de Windows está en 100%, el escenario la llena
entera, sin bordes.

## Dejarla fija en la tele

Una página web **no puede ocultar sola la barra de direcciones**: el navegador solo
permite pantalla completa después de un gesto del usuario (click, tecla o botón).

### 1. Pantalla completa desde la página (cualquier navegador moderno)

Abrí `https://carniceriaelnegro.com/tv`. Durante 15 s aparece el cartel
"Presioná OK para pantalla completa". Con el primer click, tecla o botón OK del
control remoto la página pide pantalla completa.

- Si se recarga la página (cada ~3 h), el navegador **sale** de pantalla completa
  y hay que volver a presionar OK. Para que no haga falta, usá la opción 2 o 3.
- Con un control remoto, que el botón OK le llegue a la página como tecla depende
  del navegador de la tele. **No lo pudimos verificar sin la tele real.**

### 2. F11 en una PC o mini PC conectada a la tele

En Chrome o Edge, con `/tv` abierta, presioná **F11**. Queda en pantalla completa
y se mantiene aunque la página se recargue. Para salir, F11 de nuevo.

### 3. Chrome en modo kiosco (recomendado si la tele usa una PC/mini PC con Windows)

Modo kiosco: pantalla completa permanente, sin barra ni pestañas, y sobrevive a las
recargas. Creá un acceso directo con este destino:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --no-first-run --autoplay-policy=no-user-gesture-required https://carniceriaelnegro.com/tv?fs=0
```

- `?fs=0` saca el cartel de "Presioná OK", que en kiosco no hace falta.
- Los videos son mudos, así que se reproducen solos aunque no esté el flag de autoplay.
- Para que arranque al prender la PC: copiá el acceso directo en la carpeta de inicio
  (`Win + R` → `shell:startup`).
- Para salir del modo kiosco: `Alt + F4`.
- Si Chrome no está en esa ruta, buscá `chrome.exe` y usá la ruta real.

### 4. Instalarla como app (opcional)

`/tv` tiene un manifest propio con `display: fullscreen` (solo para `/tv`, no afecta
al resto del sitio). En Chrome/Edge de escritorio se puede instalar desde el menú
("Instalar página como app" o "Transmitir, guardar y compartir → Instalar").
Que la app instalada abra de verdad en pantalla completa depende del navegador y
del sistema. **No lo pudimos verificar en la tele real**: si no queda bien, usá la opción 3.

## Evitar que se apague la pantalla

- **PC/mini PC con Windows:** Configuración → Sistema → Inicio/apagado y suspensión →
  "Pantalla: Nunca" y "Suspender: Nunca" (con el equipo enchufado).
  Desactivá también el protector de pantalla.
- **Tele:** buscá en el menú de la tele opciones como "apagado automático",
  "ahorro de energía" o "temporizador de apagado" y desactivalas. El nombre y el
  lugar cambian según la marca y el modelo; **no lo pudimos verificar sin la tele real**.
- **Navegador integrado de la tele (Smart TV):** algunos navegadores de tele no
  tienen pantalla completa, autoplay de video o se cierran solos después de un rato.
  **No está probado.** Si da problemas, lo más estable es una mini PC o un stick con
  Chrome en modo kiosco (opción 3).

## Si algo se ve mal

- **Se ve cortado en los bordes:** la tele está recortando la imagen (overscan).
  El contenido importante ya deja ~4% de margen; si igual se corta, buscá en la tele
  "Tamaño de imagen" y elegí "Ajustar a pantalla", "Just Scan", "Screen Fit" o "16:9 original".
- **Queda en negro:** la página se recupera sola a los 60 s. Si no, revisá la conexión
  y que `TV_ENABLED=true` esté en el servidor.
- **No hay ofertas, destacados o combos:** esas secciones se saltean hasta que se
  carguen productos activos y con stock desde el admin.
