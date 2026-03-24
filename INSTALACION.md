# 🚀 GUÍA DE INSTALACIÓN — Control de Producción
## Supabase + GitHub Pages (100% gratis)

---

## PASO 1 — Crear cuenta y proyecto en Supabase

1. Ir a https://supabase.com y crear cuenta gratuita
2. Click en "New Project"
3. Elegir nombre: `produccion-tracker`
4. Elegir contraseña para la base de datos (guardala en algún lugar)
5. Región: seleccionar `South America (São Paulo)` para menor latencia
6. Esperar ~2 minutos a que se inicialice el proyecto

---

## PASO 2 — Crear las tablas en Supabase

1. En el panel de Supabase, ir a **SQL Editor** (ícono de base de datos)
2. Click en **New Query**
3. Copiar y pegar todo el contenido del archivo `supabase-schema.sql`
4. Click en **Run** (▶)
5. Deberías ver: "Success. No rows returned"

---

## PASO 3 — Obtener las credenciales de Supabase

1. En el panel, ir a **Settings > API**
2. Copiar:
   - **Project URL** → va en `VITE_SUPABASE_URL`
   - **anon public key** → va en `VITE_SUPABASE_ANON_KEY`

---

## PASO 4 — Crear el Bot de Telegram

1. Abrir Telegram y buscar `@BotFather`
2. Enviar el mensaje: `/newbot`
3. Elegir nombre: `Control Produccion Bot` (o el que quieras)
4. Elegir username: `controlproduccion_bot` (debe terminar en "bot")
5. BotFather te dará un **token** → va en `VITE_TELEGRAM_BOT_TOKEN`

### Obtener el Chat ID del grupo/contacto:
**Opción A — Grupo:**
1. Crear el grupo en Telegram
2. Agregar tu bot al grupo
3. Enviar cualquier mensaje en el grupo
4. Ir a: `https://api.telegram.org/bot{TU_TOKEN}/getUpdates`
5. Buscar el campo `"chat": {"id": -1001234567890}` → ese es el Chat ID

**Opción B — Usuario individual:**
1. Iniciar conversación con tu bot (busca su username)
2. Enviar `/start`
3. Ir a: `https://api.telegram.org/bot{TU_TOKEN}/getUpdates`
4. El "id" en "from" es tu Chat ID personal

El Chat ID va en `VITE_TELEGRAM_CHAT_ID`

---

## PASO 5 — Configurar EmailJS (emails gratis)

1. Ir a https://www.emailjs.com y crear cuenta gratuita
2. En **Email Services**, click "Add New Service"
   - Elegir Gmail u otro proveedor
   - Conectar tu cuenta de email
   - Copiar el **Service ID** → va en `VITE_EMAILJS_SERVICE_ID`
3. En **Email Templates**, click "Create New Template"
   - Nombre: "Alerta Produccion"
   - Asunto del email: `{{asunto}}`
   - Cuerpo: `{{cuerpo}}`
   - Copiar el **Template ID** → va en `VITE_EMAILJS_TEMPLATE_ID`
4. En **Account > General**, copiar el **Public Key** → va en `VITE_EMAILJS_PUBLIC_KEY`

---

## PASO 6 — Configurar el proyecto localmente

1. Instalar Node.js desde https://nodejs.org (versión LTS)
2. Abrir terminal en la carpeta del proyecto
3. Copiar el archivo de variables de entorno:
   ```
   cp .env.example .env
   ```
4. Abrir `.env` con cualquier editor de texto y completar los valores:
   ```
   VITE_SUPABASE_URL=https://tuproyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_TELEGRAM_BOT_TOKEN=1234567890:ABC...
   VITE_TELEGRAM_CHAT_ID=-100123456789
   VITE_EMAILJS_SERVICE_ID=service_xxx
   VITE_EMAILJS_TEMPLATE_ID=template_xxx
   VITE_EMAILJS_PUBLIC_KEY=xxx
   VITE_EMAIL_DESTINO=tu@email.com
   ```
5. Instalar dependencias:
   ```
   npm install
   ```
6. Probar localmente:
   ```
   npm run dev
   ```
   Abrir http://localhost:5173 en el navegador

---

## PASO 7 — Subir a GitHub y publicar con GitHub Pages

1. Crear cuenta en https://github.com si no tenés
2. Crear un nuevo repositorio:
   - Ir a https://github.com/new
   - Nombre: `produccion-tracker`
   - Visibilidad: Public (necesario para GitHub Pages gratis)
   - Click "Create repository"

3. En la terminal del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/produccion-tracker.git
   git push -u origin main
   ```

4. **IMPORTANTE**: Editar `vite.config.js` y cambiar:
   ```js
   base: '/produccion-tracker/',  // <-- debe coincidir con el nombre de tu repo
   ```

---

## PASO 8 — Configurar GitHub Secrets (variables de entorno en la nube)

⚠️ NUNCA subas el archivo `.env` a GitHub (ya está en el .gitignore)

1. En GitHub, ir a tu repo > **Settings > Secrets and variables > Actions**
2. Click "New repository secret" para cada variable:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_TELEGRAM_BOT_TOKEN`
   - `VITE_TELEGRAM_CHAT_ID`
   - `VITE_EMAILJS_SERVICE_ID`
   - `VITE_EMAILJS_TEMPLATE_ID`
   - `VITE_EMAILJS_PUBLIC_KEY`
   - `VITE_EMAIL_DESTINO`

---

## PASO 9 — Crear el workflow de GitHub Actions para deploy automático

Crear el archivo `.github/workflows/deploy.yml` con este contenido:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_TELEGRAM_BOT_TOKEN: ${{ secrets.VITE_TELEGRAM_BOT_TOKEN }}
          VITE_TELEGRAM_CHAT_ID: ${{ secrets.VITE_TELEGRAM_CHAT_ID }}
          VITE_EMAILJS_SERVICE_ID: ${{ secrets.VITE_EMAILJS_SERVICE_ID }}
          VITE_EMAILJS_TEMPLATE_ID: ${{ secrets.VITE_EMAILJS_TEMPLATE_ID }}
          VITE_EMAILJS_PUBLIC_KEY: ${{ secrets.VITE_EMAILJS_PUBLIC_KEY }}
          VITE_EMAIL_DESTINO: ${{ secrets.VITE_EMAIL_DESTINO }}
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Guardar y hacer commit:
```bash
git add .
git commit -m "Add GitHub Actions deploy workflow"
git push
```

---

## PASO 10 — Activar GitHub Pages

1. En GitHub, ir a tu repo > **Settings > Pages**
2. En "Source", seleccionar: **Deploy from a branch**
3. Branch: `gh-pages` / Folder: `/ (root)`
4. Click Save

En unos minutos la app estará en:
`https://TU_USUARIO.github.io/produccion-tracker/`

---

## ✅ RESUMEN DE COSTOS

| Servicio       | Plan     | Costo |
|----------------|----------|-------|
| Supabase       | Free     | $0    |
| GitHub Pages   | Free     | $0    |
| Telegram Bot   | Free     | $0    |
| EmailJS        | Free     | $0    |
| **TOTAL**      |          | **$0** |

---

## 🔧 Para actualizar la app en el futuro

Simplemente editar los archivos y hacer:
```bash
git add .
git commit -m "descripción del cambio"
git push
```
GitHub Actions re-deployará automáticamente en ~2 minutos.
