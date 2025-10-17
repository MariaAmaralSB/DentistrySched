export type Guid = string;

export type Dentista = { id: Guid; nome: string; cro?: string };
export type Procedimento = { id: Guid; nome: string; duracaoMin: number; bufferMin: number };
export type SlotDto = { horaISO: string };

export type CriarConsultaDto = {
  dentistaId: Guid;
  procedimentoId: Guid;
  inicio: string; // ISO
  pacienteNome: string;
  celularWhatsApp: string;
  email?: string;
  descricao?: string;
  sintomas?: string[];
};