export interface Turno {
  id: number;
  fecha: string;              // ISO date string, ej: '2025-06-20'
  hora: string;               // ej: '14:30'
  especialidad: string;
  especialista: {
  nombre: string;
  apellido: string;
  };
  paciente?: {               // solo para especialista
    nombre: string;
    apellido: string;
  };
  estado: 'Pendiente' | 'Aceptado' | 'Realizado' | 'Cancelado' | 'Rechazado';
  comentario_especialista?: string;
  comentario_paciente?: string;
}
