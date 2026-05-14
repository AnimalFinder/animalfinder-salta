# 🐾 PawFinder Salta — Guía de instalación completa
**Desarrollado por Emmanuel Farías**

---

## ✅ PASO 1 — Configurar Supabase (base de datos)

1. Ir a **https://supabase.com** → Crear cuenta gratuita
2. Hacer clic en **"New Project"**
   - Nombre: `pawfinder-salta`
   - Password: (elegí uno seguro, guardalo)
   - Region: `South America (São Paulo)`
3. Esperar ~2 minutos a que se cree el proyecto
4. Ir a **SQL Editor** → **New Query**
5. Copiar TODO el contenido de `supabase_schema.sql` y hacer **Run**
6. Ir a **Settings → API**
   - Copiar `Project URL` → va en `VITE_SUPABASE_URL`
   - Copiar `anon public key` → va en `VITE_SUPABASE_ANON_KEY`

---

## ✅ PASO 2 — Configurar Cloudinary (fotos)

1. Ir a **https://cloudinary.com** → Crear cuenta gratuita
2. En el Dashboard copiar tu **Cloud Name**
3. Ir a **Settings → Upload → Upload presets**
4. Hacer clic en **"Add upload preset"**
   - Preset name: `animalfinder_uploads`
   - Signing mode: `Unsigned`
   - Guardar
5. Copiar el Cloud Name → va en `VITE_CLOUDINARY_CLOUD_NAME`

---

## ✅ PASO 3 — Configurar Petfinder API (opcional)

1. Ir a **https://www.petfinder.com/developers/**
2. Registrarse → Crear una API Key
3. Copiar `API Key` → va en `VITE_PETFINDER_KEY`
4. Copiar `Secret` → va en `VITE_PETFINDER_SECRET`

---

## ✅ PASO 4 — Crear el archivo .env

En la carpeta raíz del proyecto, crear un archivo llamado `.env`:

```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=animalfinder_uploads
VITE_PETFINDER_KEY=tu_petfinder_key
VITE_PETFINDER_SECRET=tu_petfinder_secret
```

---

## ✅ PASO 5 — Instalar y probar localmente

```bash
# Instalar dependencias
npm install

# Correr en modo desarrollo
npm run dev

# Abrir en el navegador: http://localhost:5173
```

---

## ✅ PASO 6 — Subir a GitHub

1. Crear cuenta en **https://github.com**
2. Crear repositorio nuevo → `animalfinder-salta`
3. En la carpeta del proyecto:

```bash
git init
git add .
git commit -m "🐾 AnimalFinder Salta v2.0 por Emmanuel Farías"
git remote add origin https://github.com/TU_USUARIO/animalfinder-salta.git
git push -u origin main
```

---

## ✅ PASO 7 — Publicar en Vercel (gratis)

1. Ir a **https://vercel.com** → Crear cuenta con GitHub
2. Hacer clic en **"New Project"**
3. Importar el repositorio `animalfinder-salta`
4. En **Environment Variables** agregar todas las del `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
   - `VITE_PETFINDER_KEY`
   - `VITE_PETFINDER_SECRET`
5. Hacer clic en **Deploy**
6. En ~2 minutos tenés tu URL: `animalfinder-salta.vercel.app`

---

## 🎉 ¡Listo!

Tu app está en línea. Cualquier persona puede:
- Abrir la URL desde el celular o computadora
- Registrarse y publicar avisos
- Ver el mapa interactivo
- Instalarla como app en el celular (PWA)

---

## 📁 Estructura del proyecto

```
animalfinder/
├── src/
│   ├── App.jsx              ← App principal con toda la UI
│   ├── main.jsx             ← Punto de entrada
│   ├── hooks/
│   │   ├── useAuth.jsx      ← Autenticación con Supabase
│   │   └── useAnimals.js    ← Datos + Realtime + APIs externas
│   └── lib/
│       ├── supabase.js      ← Cliente Supabase + helpers
│       ├── cloudinary.js    ← Subida de fotos
│       ├── externalApis.js  ← Petfinder + Reddit + AdoptAPet
│       └── seedData.js      ← Datos demo + constantes
├── index.html
├── vite.config.js           ← Config PWA
├── package.json
├── supabase_schema.sql      ← Ejecutar en Supabase
├── .env.example             ← Plantilla de variables
└── INSTALACION.md           ← Esta guía
```

---

**AnimalFinder Salta** · Por Emmanuel Farías · 2025
