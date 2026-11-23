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

## Parámetros de la URL

| Parámetro | Qué hace | En producción |
|-----------|----------|---------------|
| `?qr=90`  | Segundos de la pausa con el QR (10 a 1800, por defecto 90) | Sí |
| `?fs=0`   | No pide pantalla completa ni muestra el cartel "Presioná OK" | Sí |
| `?speed=10` | Acelera el bucle (revisión) | Se ignora |
| `?debug`  | Muestra fase, vuelta y escala arriba a la izquierda | Se ignora |
| `?mock=1` | Productos de ejemplo, para ver el diseño con la base vacía | Se ignora (ni siquiera está en el build) |

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
