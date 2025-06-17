// src/app/core/error.service.ts
import { Injectable } from '@angular/core';
import { PostgrestError } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  /** Traduce un PostgrestError a un mensaje en castellano */
  translate(error: PostgrestError): string {
    if (!error) return 'Ha ocurrido un error inesperado';

    switch (error.code) {
      case '23505':  // clave duplicada
        if (error.message.includes('profiles_email_key')) {
          return 'Ya existe un usuario con ese correo.';
        }
        if (error.message.includes('profiles_pkey')) {
          return 'El perfil ya existe.';
        }
        return 'Ya existe un registro con esos datos.';
      case '23503':  // violación FK
        return 'No se encontró el usuario asociado.';
      case '400':
        return 'Solicitud inválida. Verifica los datos ingresados.';
      case '422':
        return 'Formato de datos incorrecto.';
      default:
        // Si no coincide un código conocido, devolvemos el mensaje original en castellano “aprox.”
        return this.humanize(error.message);
    }
  }

/** Limpia mensajes técnicos y evita operar sobre undefined */
  private humanize(msg: string | undefined): string {
    if (typeof msg !== 'string' || !msg.trim()) {
      return 'Ha ocurrido un error.';
    }
    return msg
      .replace(/["\[\]]/g, '')
      .replace(/[_\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
