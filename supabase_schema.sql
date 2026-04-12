-- Copia y pega esto en el 'SQL Editor' de tu panel de Supabase y dale a RUN (Play)

-- 1. Tabla Perfil de Negocio
CREATE TABLE valeria_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name text,
  delivery_landing text,
  delivery_web text,
  delivery_ecommerce text,
  payment_methods text,
  payment_terms text,
  portfolio_url text,
  extra_notes text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Como solo hay un perfil, usamos esta vista simplificada
-- (Si se escala a una aplicación multi-usuario o SaaS, el schema requeriría un 'user_id' por fila).

-- 2. Tabla Memoria (Base para la Vector DB en el futuro)
CREATE TABLE valeria_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_text text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Tabla Chats (Prospectos)
CREATE TABLE valeria_chats (
  id text PRIMARY KEY,  -- Usamos el id autogenerado del frontend (ej: abc1234)
  title text,
  ts bigint,
  preview text,
  prospect_name text,
  sector text,
  phone text,
  instagram text,
  google_maps text,
  stage text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. Tabla Mensajes (Historial de los chats)
CREATE TABLE valeria_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text REFERENCES valeria_chats(id) ON DELETE CASCADE,
  role text,
  content text,
  sources jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
