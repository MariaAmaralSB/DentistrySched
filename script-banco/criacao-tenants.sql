-- ================================
--  MULTI-TENANT UPGRADE SCRIPT
--  Troque o GUID do tenant padrão abaixo
-- ================================
DO $$
DECLARE
  v_tenant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
  -- 1) Adicionar coluna TenantId (se não existir) nas tabelas principais
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='Dentistas' AND column_name='TenantId') THEN
    ALTER TABLE "public"."Dentistas" ADD COLUMN "TenantId" uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='Procedimentos' AND column_name='TenantId') THEN
    ALTER TABLE "public"."Procedimentos" ADD COLUMN "TenantId" uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='Pacientes' AND column_name='TenantId') THEN
    ALTER TABLE "public"."Pacientes" ADD COLUMN "TenantId" uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='Consultas' AND column_name='TenantId') THEN
    ALTER TABLE "public"."Consultas" ADD COLUMN "TenantId" uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='AgendaRegras' AND column_name='TenantId') THEN
    ALTER TABLE "public"."AgendaRegras" ADD COLUMN "TenantId" uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='AgendaExcecoes' AND column_name='TenantId') THEN
    ALTER TABLE "public"."AgendaExcecoes" ADD COLUMN "TenantId" uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='AgendaDatas' AND column_name='TenantId') THEN
    ALTER TABLE "public"."AgendaDatas" ADD COLUMN "TenantId" uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='DentistaProcedimento' AND column_name='TenantId') THEN
    ALTER TABLE "public"."DentistaProcedimento" ADD COLUMN "TenantId" uuid;
  END IF;

  -- 2) Preencher TenantId com o tenant padrão nas linhas existentes
  UPDATE "public"."Dentistas"              SET "TenantId" = COALESCE("TenantId", v_tenant);
  UPDATE "public"."Procedimentos"          SET "TenantId" = COALESCE("TenantId", v_tenant);
  UPDATE "public"."Pacientes"              SET "TenantId" = COALESCE("TenantId", v_tenant);
  UPDATE "public"."Consultas"              SET "TenantId" = COALESCE("TenantId", v_tenant);
  UPDATE "public"."AgendaRegras"           SET "TenantId" = COALESCE("TenantId", v_tenant);
  UPDATE "public"."AgendaExcecoes"         SET "TenantId" = COALESCE("TenantId", v_tenant);
  UPDATE "public"."AgendaDatas"            SET "TenantId" = COALESCE("TenantId", v_tenant);
  UPDATE "public"."DentistaProcedimento"   SET "TenantId" = COALESCE("TenantId", v_tenant);

  -- 3) Tornar NOT NULL
  ALTER TABLE "public"."Dentistas"            ALTER COLUMN "TenantId" SET NOT NULL;
  ALTER TABLE "public"."Procedimentos"        ALTER COLUMN "TenantId" SET NOT NULL;
  ALTER TABLE "public"."Pacientes"            ALTER COLUMN "TenantId" SET NOT NULL;
  ALTER TABLE "public"."Consultas"            ALTER COLUMN "TenantId" SET NOT NULL;
  ALTER TABLE "public"."AgendaRegras"         ALTER COLUMN "TenantId" SET NOT NULL;
  ALTER TABLE "public"."AgendaExcecoes"       ALTER COLUMN "TenantId" SET NOT NULL;
  ALTER TABLE "public"."AgendaDatas"          ALTER COLUMN "TenantId" SET NOT NULL;
  ALTER TABLE "public"."DentistaProcedimento" ALTER COLUMN "TenantId" SET NOT NULL;

  -- 4) Índices por TenantId (se não existirem)
  CREATE INDEX IF NOT EXISTS "IX_Dentistas_TenantId"               ON "public"."Dentistas"            ("TenantId");
  CREATE INDEX IF NOT EXISTS "IX_Procedimentos_TenantId"           ON "public"."Procedimentos"        ("TenantId");
  CREATE INDEX IF NOT EXISTS "IX_Pacientes_TenantId"               ON "public"."Pacientes"            ("TenantId");
  CREATE INDEX IF NOT EXISTS "IX_Consultas_TenantId"               ON "public"."Consultas"            ("TenantId");
  CREATE INDEX IF NOT EXISTS "IX_AgendaRegras_TenantId"            ON "public"."AgendaRegras"         ("TenantId");
  CREATE INDEX IF NOT EXISTS "IX_AgendaExcecoes_TenantId"          ON "public"."AgendaExcecoes"       ("TenantId");
  CREATE INDEX IF NOT EXISTS "IX_AgendaDatas_TenantId"             ON "public"."AgendaDatas"          ("TenantId");
  CREATE INDEX IF NOT EXISTS "IX_DentistaProcedimento_TenantId"    ON "public"."DentistaProcedimento" ("TenantId");

  -- 5) Alternate Keys {TenantId, Id} (para suportar FKs compostas)
  --    Cria UNIQUE (TenantId, Id) em Dentistas e Procedimentos, se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
      WHERE conname='AK_Dentistas_TenantId_Id' AND conrelid='public."Dentistas"'::regclass
  ) THEN
    ALTER TABLE "public"."Dentistas" ADD CONSTRAINT "AK_Dentistas_TenantId_Id" UNIQUE ("TenantId","Id");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
      WHERE conname='AK_Procedimentos_TenantId_Id' AND conrelid='public."Procedimentos"'::regclass
  ) THEN
    ALTER TABLE "public"."Procedimentos" ADD CONSTRAINT "AK_Procedimentos_TenantId_Id" UNIQUE ("TenantId","Id");
  END IF;

  -- 6) Ajustar chave primária e FKs da tabela de vínculo
  --    PK antiga costuma ser (DentistaId, ProcedimentoId) — vamos trocar para (TenantId, DentistaId, ProcedimentoId)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid='public."DentistaProcedimento"'::regclass 
      AND contype='p' 
      AND conname='PK_DentistaProcedimento'
  ) THEN
    ALTER TABLE "public"."DentistaProcedimento" DROP CONSTRAINT "PK_DentistaProcedimento";
  END IF;

  -- Algumas scaffolds geram nome de PK diferente; se não conhecer o nome, tente:
  -- ALTER TABLE "public"."DentistaProcedimento" DROP CONSTRAINT IF EXISTS "DentistaProcedimento_pkey";

  ALTER TABLE "public"."DentistaProcedimento"
    ADD CONSTRAINT "PK_DentistaProcedimento" 
    PRIMARY KEY ("TenantId","DentistaId","ProcedimentoId");

  -- Dropar FKs antigas (nomes podem variar; ajuste se necessário)
  ALTER TABLE "public"."DentistaProcedimento" DROP CONSTRAINT IF EXISTS "FK_DentistaProcedimento_Dentistas_DentistaId";
  ALTER TABLE "public"."DentistaProcedimento" DROP CONSTRAINT IF EXISTS "FK_DentistaProcedimento_Procedimentos_ProcedimentoId";

  -- Criar FKs compostas para garantir que o vínculo é do mesmo Tenant
  ALTER TABLE "public"."DentistaProcedimento"
    ADD CONSTRAINT "FK_DentistaProcedimento_Dentistas_Tenant_Dentista"
      FOREIGN KEY ("TenantId","DentistaId")
      REFERENCES "public"."Dentistas" ("TenantId","Id")
      ON DELETE CASCADE;

  ALTER TABLE "public"."DentistaProcedimento"
    ADD CONSTRAINT "FK_DentistaProcedimento_Procedimentos_Tenant_Proced"
      FOREIGN KEY ("TenantId","ProcedimentoId")
      REFERENCES "public"."Procedimentos" ("TenantId","Id")
      ON DELETE CASCADE;

  -- Índice auxiliar para buscas por procedimento dentro do tenant
  CREATE INDEX IF NOT EXISTS "IX_DentistaProcedimento_Tenant_ProcId"
    ON "public"."DentistaProcedimento" ("TenantId","ProcedimentoId");

END $$;

-- 7) (OPCIONAL) Fortalecer unicidade da consulta por Tenant
--    Se você tem um índice único antigo em (DentistaId, Inicio, Fim), troque para incluir TenantId.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid='public."Consultas"'::regclass AND conname='IX_Consultas_DentistaId_Inicio_Fim'
  ) THEN
    ALTER TABLE "public"."Consultas" DROP CONSTRAINT "IX_Consultas_DentistaId_Inicio_Fim";
  END IF;

  -- cria único por tenant (ajuste nomes de colunas conforme seu schema real)
  DO $inner$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid='public."Consultas"'::regclass 
        AND conname='UX_Consultas_Tenant_Dentista_Inicio_Fim'
    ) THEN
      ALTER TABLE "public"."Consultas"
        ADD CONSTRAINT "UX_Consultas_Tenant_Dentista_Inicio_Fim"
        UNIQUE ("TenantId","DentistaId","Inicio","Fim");
    END IF;
  END
  $inner$;
END $$;

-- 8) (OPCIONAL) Se quiser FKs compostas também em Consultas (mesma ideia do vínculo),
--    descomente e ajuste os nomes das constraints antigas, se existirem:

/*
ALTER TABLE "public"."Consultas" DROP CONSTRAINT IF EXISTS "FK_Consultas_Dentistas_DentistaId";
ALTER TABLE "public"."Consultas" DROP CONSTRAINT IF EXISTS "FK_Consultas_Procedimentos_ProcedimentoId";
ALTER TABLE "public"."Consultas" DROP CONSTRAINT IF EXISTS "FK_Consultas_Pacientes_PacienteId";

-- Crie AK (TenantId, Id) para Pacientes se for referenciar composto:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
      WHERE conname='AK_Pacientes_TenantId_Id' AND conrelid='public."Pacientes"'::regclass
  ) THEN
    ALTER TABLE "public"."Pacientes" ADD CONSTRAINT "AK_Pacientes_TenantId_Id" UNIQUE ("TenantId","Id");
  END IF;
END $$;

ALTER TABLE "public"."Consultas"
  ADD CONSTRAINT "FK_Consultas_Dentistas_Tenant"
    FOREIGN KEY ("TenantId","DentistaId")
    REFERENCES "public"."Dentistas" ("TenantId","Id");

ALTER TABLE "public"."Consultas"
  ADD CONSTRAINT "FK_Consultas_Procedimentos_Tenant"
    FOREIGN KEY ("TenantId","ProcedimentoId")
    REFERENCES "public"."Procedimentos" ("TenantId","Id");

ALTER TABLE "public"."Consultas"
  ADD CONSTRAINT "FK_Consultas_Pacientes_Tenant"
    FOREIGN KEY ("TenantId","PacienteId")
    REFERENCES "public"."Pacientes" ("TenantId","Id");
*/
