-- =========================================
-- DentistrySched – Migração: suporte a Retorno
-- Tabelas: consultas, procedimentos
-- PostgreSQL
-- =========================================

-- 1) CONSULTAS: novos campos
--    - is_retorno (bool)
--    - consulta_origem_id (uuid) com FK para consultas(id)

ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS is_retorno boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consulta_origem_id uuid NULL;

-- FK autorrreferente (consulta de origem) - ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.table_constraints
     WHERE constraint_schema = current_schema()
       AND table_name = 'consultas'
       AND constraint_name = 'fk_consultas_consulta_origem'
  ) THEN
    ALTER TABLE consultas
      ADD CONSTRAINT fk_consultas_consulta_origem
      FOREIGN KEY (consulta_origem_id)
      REFERENCES consultas(id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- Índices úteis
CREATE INDEX IF NOT EXISTS ix_consultas_consulta_origem_id ON consultas (consulta_origem_id);
CREATE INDEX IF NOT EXISTS ix_consultas_is_retorno            ON consultas (is_retorno);

-- 2) PROCEDIMENTOS: campo opcional para sugerir retorno padrão
--    - retorno_em_dias (int, nullable)
ALTER TABLE procedimentos
  ADD COLUMN IF NOT EXISTS retorno_em_dias integer NULL;

-- Regra simples de faixa (0..365) para evitar valores absurdos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.check_constraints
     WHERE constraint_schema = current_schema()
       AND constraint_name = 'ck_procedimentos_retorno_em_dias_range'
  ) THEN
    ALTER TABLE procedimentos
      ADD CONSTRAINT ck_procedimentos_retorno_em_dias_range
      CHECK (retorno_em_dias IS NULL OR (retorno_em_dias >= 0 AND retorno_em_dias <= 365));
  END IF;
END$$;

-- Done.
