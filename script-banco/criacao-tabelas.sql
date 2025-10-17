-- Extensão para gerar UUIDs (opcional se você gerar Guid no app)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DENTISTAS
CREATE TABLE IF NOT EXISTS "Dentistas" (
  "Id"           uuid PRIMARY KEY,
  "Nome"         text NOT NULL,
  "CRO"          text NULL
);

-- PROCEDIMENTOS
CREATE TABLE IF NOT EXISTS "Procedimentos" (
  "Id"          uuid PRIMARY KEY,
  "Nome"        text NOT NULL,
  "DuracaoMin"  integer NOT NULL,
  "BufferMin"   integer NOT NULL
);

-- RELAÇÃO N:N (Dentista x Procedimento)
CREATE TABLE IF NOT EXISTS "DentistaProcedimento" (
  "DentistaId"      uuid NOT NULL,
  "ProcedimentoId"  uuid NOT NULL,
  CONSTRAINT "PK_DentistaProcedimento" PRIMARY KEY ("DentistaId","ProcedimentoId"),
  CONSTRAINT "FK_DP_Dentistas"      FOREIGN KEY ("DentistaId")     REFERENCES "Dentistas"("Id")     ON DELETE CASCADE,
  CONSTRAINT "FK_DP_Procedimentos"  FOREIGN KEY ("ProcedimentoId") REFERENCES "Procedimentos"("Id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IX_DentistaProcedimento_ProcedimentoId"
  ON "DentistaProcedimento" ("ProcedimentoId");

-- PACIENTES
CREATE TABLE IF NOT EXISTS "Pacientes" (
  "Id"                    uuid PRIMARY KEY,
  "Nome"                  text NOT NULL,
  "CelularWhatsApp"       varchar(30) NOT NULL,
  "Email"                 text NULL,
  "ConsentimentoWhatsApp" boolean NOT NULL DEFAULT false
);

-- AGENDA REGRAS (semanais)
CREATE TABLE IF NOT EXISTS "AgendaRegras" (
  "Id"          uuid PRIMARY KEY,
  "DentistaId"  uuid NOT NULL,
  "DiaSemana"   integer NOT NULL,
  "InicioManha" time    NOT NULL,
  "FimManha"    time    NOT NULL,
  "InicioTarde" time    NULL,
  "FimTarde"    time    NULL,
  CONSTRAINT "FK_AR_Dentistas" FOREIGN KEY ("DentistaId") REFERENCES "Dentistas"("Id") ON DELETE CASCADE
);

-- AGENDA DATAS (ajustes por dia)
CREATE TABLE IF NOT EXISTS "AgendaDatas" (
  "Id"         uuid PRIMARY KEY,
  "DentistaId" uuid NOT NULL,
  "Data"       date NOT NULL,
  "ManhaDe"    time NULL,
  "ManhaAte"   time NULL,
  "TardeDe"    time NULL,
  "TardeAte"   time NULL,
  "Observacao" text NULL,
  CONSTRAINT "FK_AD_Dentistas" FOREIGN KEY ("DentistaId") REFERENCES "Dentistas"("Id") ON DELETE CASCADE,
  CONSTRAINT "UQ_AD_Dentista_Data" UNIQUE ("DentistaId","Data")
);

-- AGENDA EXCEÇÕES (fechado/aberto em horários específicos)
CREATE TABLE IF NOT EXISTS "AgendaExcecoes" (
  "Id"            uuid PRIMARY KEY,
  "DentistaId"    uuid NOT NULL,
  "Data"          date NOT NULL,
  "FechadoDiaTodo" boolean NOT NULL DEFAULT false,
  "AbrirManhaDe"   time NULL,
  "AbrirManhaAte"  time NULL,
  "AbrirTardeDe"   time NULL,
  "AbrirTardeAte"  time NULL,
  "Motivo"         text NULL,
  CONSTRAINT "FK_AE_Dentistas" FOREIGN KEY ("DentistaId") REFERENCES "Dentistas"("Id") ON DELETE CASCADE,
  CONSTRAINT "UQ_AE_Dentista_Data" UNIQUE ("DentistaId","Data")
);

-- CONSULTAS (com PreTriagem em JSONB)
CREATE TABLE IF NOT EXISTS "Consultas" (
  "Id"             uuid PRIMARY KEY,
  "DentistaId"     uuid NOT NULL,
  "PacienteId"     uuid NOT NULL,
  "ProcedimentoId" uuid NOT NULL,
  "Inicio"         timestamptz NOT NULL,
  "Fim"            timestamptz NOT NULL,
  "Status"         integer NOT NULL,
  "PreTriagem"     jsonb NULL,
  CONSTRAINT "FK_C_Dentistas"     FOREIGN KEY ("DentistaId")     REFERENCES "Dentistas"("Id") ON DELETE CASCADE,
  CONSTRAINT "FK_C_Pacientes"     FOREIGN KEY ("PacienteId")     REFERENCES "Pacientes"("Id") ON DELETE CASCADE,
  CONSTRAINT "FK_C_Procedimentos" FOREIGN KEY ("ProcedimentoId") REFERENCES "Procedimentos"("Id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Consultas_Dentista_Inicio_Fim"
  ON "Consultas" ("DentistaId","Inicio","Fim");
