-- ═══════════════════════════════════════════════════════════════════════════
-- ANIMALFINDER SALTA — ESQUEMA SUPABASE
-- Creado por Emmanuel Farías
-- Correo emmanuelesequiel2018gmail.com
-- Ejecutá esto en: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── EXTENSIONES ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- Para geolocalización avanzada

-- ── TABLA: PERFILES DE USUARIO ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  zone        TEXT,
  is_ong      BOOLEAN DEFAULT FALSE,
  ong_name    TEXT,
  verified    BOOLEAN DEFAULT FALSE,
  posts_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: AVISOS DE MASCOTAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS animals (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Tipo y especie
  type        TEXT NOT NULL CHECK (type IN ('perdido','encontrado','adopcion')),
  species     TEXT NOT NULL CHECK (species IN ('perro','gato','otro')),
  name        TEXT NOT NULL DEFAULT 'Sin nombre',
  breed       TEXT,
  color       TEXT,
  size        TEXT CHECK (size IN ('pequeño','mediano','grande')),
  age         TEXT,
  gender      TEXT CHECK (gender IN ('macho','hembra','desconocido')),

  -- Ubicación
  zone        TEXT,
  address     TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,

  -- Contenido
  description TEXT NOT NULL,
  photos      TEXT[] DEFAULT '{}',
  phone       TEXT,
  reward      TEXT,

  -- Estado y metadata
  status      TEXT DEFAULT 'activo' CHECK (status IN ('activo','resuelto','eliminado')),
  verified    BOOLEAN DEFAULT FALSE,
  source      TEXT DEFAULT 'manual' CHECK (source IN ('manual','ong','petfinder','reddit','adoptapet','ai')),
  external_id TEXT, -- ID en fuente externa (Petfinder, Reddit, etc.)

  -- Estadísticas
  views       INTEGER DEFAULT 0,
  likes       INTEGER DEFAULT 0,

  -- Timestamps
  lost_date   DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: FAVORITOS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  animal_id  UUID REFERENCES animals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, animal_id)
);

-- ── TABLA: COMENTARIOS / PISTAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  animal_id  UUID REFERENCES animals(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  is_sighting BOOLEAN DEFAULT FALSE, -- Es un avistamiento?
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: NOTIFICACIONES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL, -- 'new_animal','comment','resolved','sighting'
  title      TEXT NOT NULL,
  body       TEXT,
  animal_id  UUID REFERENCES animals(id) ON DELETE SET NULL,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: FUENTES EXTERNAS (caché) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_cache (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source      TEXT NOT NULL,
  external_id TEXT NOT NULL,
  data        JSONB,
  synced_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, external_id)
);

-- ── ÍNDICES PARA PERFORMANCE ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_animals_type     ON animals(type);
CREATE INDEX IF NOT EXISTS idx_animals_species  ON animals(species);
CREATE INDEX IF NOT EXISTS idx_animals_zone     ON animals(zone);
CREATE INDEX IF NOT EXISTS idx_animals_status   ON animals(status);
CREATE INDEX IF NOT EXISTS idx_animals_source   ON animals(source);
CREATE INDEX IF NOT EXISTS idx_animals_created  ON animals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_animals_location ON animals(lat, lng);
CREATE INDEX IF NOT EXISTS idx_favorites_user   ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_animal  ON comments(animal_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user      ON notifications(user_id, read);

-- ── ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────────
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: todos pueden leer, solo el dueño puede editar
CREATE POLICY "Profiles públicos" ON profiles FOR SELECT USING (true);
CREATE POLICY "Editar propio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insertar propio perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Animals: todos pueden leer activos, autenticados pueden crear, dueño puede editar
CREATE POLICY "Ver animales activos" ON animals FOR SELECT USING (status != 'eliminado');
CREATE POLICY "Crear aviso autenticado" ON animals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Editar propio aviso" ON animals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Eliminar propio aviso" ON animals FOR DELETE USING (auth.uid() = user_id);

-- Favorites: solo el dueño
CREATE POLICY "Ver propios favoritos" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Agregar favorito" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar favorito" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Comments: todos leen, autenticados comentan
CREATE POLICY "Ver comentarios" ON comments FOR SELECT USING (true);
CREATE POLICY "Agregar comentario" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Notificaciones: solo el dueño
CREATE POLICY "Ver propias notifs" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Actualizar propias notifs" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ── FUNCIÓN: AUTO-CREAR PERFIL AL REGISTRARSE ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario PawFinder'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── FUNCIÓN: INCREMENTAR VISTAS ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_views(animal_id UUID)
RETURNS void AS $$
  UPDATE animals SET views = views + 1 WHERE id = animal_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── FUNCIÓN: TOGGLE LIKE ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION toggle_favorite(p_user_id UUID, p_animal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  existing_id UUID;
  is_fav BOOLEAN;
BEGIN
  SELECT id INTO existing_id FROM favorites WHERE user_id = p_user_id AND animal_id = p_animal_id;
  IF existing_id IS NOT NULL THEN
    DELETE FROM favorites WHERE id = existing_id;
    UPDATE animals SET likes = likes - 1 WHERE id = p_animal_id;
    is_fav := FALSE;
  ELSE
    INSERT INTO favorites (user_id, animal_id) VALUES (p_user_id, p_animal_id);
    UPDATE animals SET likes = likes + 1 WHERE id = p_animal_id;
    is_fav := TRUE;
  END IF;
  RETURN is_fav;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── REALTIME: HABILITAR PARA TABLAS CLAVE ────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE animals;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ═══════════════════════════════════════════════════════════════════════════
-- ¡LISTO! Tu base de datos PawFinder está configurada.
-- Próximo paso: copiar las credenciales al archivo .env
-- ═══════════════════════════════════════════════════════════════════════════
