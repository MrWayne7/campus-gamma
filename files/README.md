# Campus Gamma — sitio + panel

Sitio público (`index.html`) + panel de administrador (`/admin`) + backend en
Cloudflare Pages Functions con KV. Todo gratis, todo por terminal.

## Estructura
- `index.html` — sitio público. Se pinta solo y se hidrata con el contenido del panel.
- `content.json` — contenido por defecto (fallback estático y semilla del panel).
- `admin/index.html` — panel de administrador.
- `functions/api/*` — API: contenido, login, logout, inscripciones.
- `wrangler.toml` — config de Pages + binding de KV.

El sitio **funciona completo sin backend**: si no configuras KV ni contraseña,
el panel entra en "modo local" y guardas exportando `content.json` para versionarlo.
El backend añade: guardar en vivo desde el panel y capturar inscritos.

---

## Despliegue básico (sin backend)
Desde la carpeta del proyecto:

```
git init
```
```
git add -A
```
```
git commit -m "campus gamma"
```
```
gh repo create campus-gamma --public --source=. --remote=origin --push
```
```
npx wrangler@latest pages deploy . --project-name=campus-gamma --commit-dirty=true
```

Queda en `https://campus-gamma.pages.dev`. El panel en `https://campus-gamma.pages.dev/admin` (modo local).

---

## Activar el backend (panel en vivo + inscritos)

Paso 1 — crear el namespace KV y copiar el id a `wrangler.toml`:

```
npx wrangler@latest kv namespace create CAMPUS_KV
```

Pega el `id` que imprime en `wrangler.toml`, reemplazando `PEGA_AQUI_EL_ID_DE_TU_KV`.

Paso 2 — desplegar para crear el proyecto y enlazar el KV:

```
npx wrangler@latest pages deploy . --project-name=campus-gamma --commit-dirty=true
```

Paso 3 — poner la contraseña del admin (te la pide al correr):

```
npx wrangler@latest pages secret put ADMIN_PASSWORD --project-name=campus-gamma
```

Paso 4 — volver a desplegar para que tome la contraseña:

```
npx wrangler@latest pages deploy . --project-name=campus-gamma --commit-dirty=true
```

Listo: entra a `/admin`, ingresa la contraseña, edita y toca Guardar.

---

## Actualizar
Edita lo que sea y vuelve a desplegar:

```
git add -A
```
```
git commit -m "update"
```
```
npx wrangler@latest pages deploy . --project-name=campus-gamma --commit-dirty=true
```

---

## Reemplazar antes de compartir
- WhatsApp de reservas, TikTok, boletería y correo — en el panel (Canales).
- Fotos y flyers reales — en el panel (Galería).
- Fechas reales — en el panel (Agenda).
- `ADMIN_PASSWORD` — tu contraseña real (nunca va en el código, solo como secret).
