-- ============================================================
-- MyBolucompras — Schema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabla de gastos
CREATE TABLE IF NOT EXISTS gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  objeto TEXT NOT NULL,
  fecha DATE NOT NULL,
  medio TEXT NOT NULL,
  cuotas INTEGER DEFAULT 1,
  tipo TEXT CHECK (tipo IS NULL OR tipo IN ('debito','credito')),
  moneda TEXT NOT NULL DEFAULT 'ARS',
  banco TEXT,
  cantidad INTEGER DEFAULT 1,
  precio DECIMAL(12,2) NOT NULL DEFAULT 0,
  etiqueta TEXT,
  es_fijo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de configuración de usuario
-- Incluye etiquetas y presupuestos como JSONB para simplificar
CREATE TABLE IF NOT EXISTS configuracion_usuario (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  cierre DATE,
  vencimiento DATE,
  cierre_anterior DATE,
  vencimiento_anterior DATE,
  fondos DECIMAL(12,2) DEFAULT 0,
  etiquetas JSONB DEFAULT '[]'::jsonb,
  presupuestos JSONB DEFAULT '{}'::jsonb,
  presupuesto_mensual_max DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- Cada usuario solo puede ver y modificar sus propios datos
-- ============================================================

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_usuario ENABLE ROW LEVEL SECURITY;

-- Políticas para gastos
CREATE POLICY "gastos: solo el dueño puede ver" ON gastos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gastos: solo el dueño puede insertar" ON gastos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gastos: solo el dueño puede actualizar" ON gastos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "gastos: solo el dueño puede eliminar" ON gastos
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para configuracion_usuario
CREATE POLICY "config: solo el dueño puede ver" ON configuracion_usuario
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "config: solo el dueño puede insertar" ON configuracion_usuario
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "config: solo el dueño puede actualizar" ON configuracion_usuario
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- Función helper para crear config inicial al registrarse
-- (opcional: puede usarse con un trigger en auth.users)
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_config_inicial()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.configuracion_usuario (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: cuando se crea un usuario, se crea su configuración vacía
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_config_inicial();
