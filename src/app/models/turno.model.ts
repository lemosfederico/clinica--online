export interface Turno {
  id: number;
  fecha: string;
  hora: string;
  especialidad: string;
  paciente_id: string;
  especialista_id: string;
  especialista?: { user_id: string; nombre: string; apellido: string; };
  estado: string;
  comentario_especialista?: string;
  comentario_paciente?: string;
}