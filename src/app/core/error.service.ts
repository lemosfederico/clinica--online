// src/app/core/error.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  /** Traduce errores de Auth y PostgREST a castellano */
  translate(error: any): string {
    const raw = error?.message ?? '';
    const msg = raw.toLowerCase();

    // — Errores de Auth (no tienen .code) —
    if (!error?.code) {
      if (msg.includes('Email not confirmed')) {
        return 'El correo electrónico no ha sido confirmado.';
      }
      if (msg.includes('invalid email')) {
        return 'Dirección de correo electrónico no válida.';
      }
      if (msg.includes('invalid login credentials') ||
          msg.includes('invalid password') ||
          msg.includes('invalid login')) {
        return 'Correo o contraseña incorrectos.';
      }
      if (msg.includes('security')) {
        return 'Por seguridad, espera unos segundos antes de reintentar.';
      }
      return 'Ha ocurrido un error de autenticación.';
    }

    // — Errores de PostgREST (tienen .code) —
    switch (error.code) {
      case '23505':
        // duplicados
        if (raw.includes('profiles_email_key')) {
          return 'Ya existe un usuario con ese correo.';
        }
        return 'Ya existe un registro con esos datos.';
      case '23503':
        return 'No se encontró el usuario asociado.';
      case '400':
        return 'Solicitud inválida. Verifica los datos ingresados.';
      case '422':
        return 'Formato de datos incorrecto.';
      default:
        return this.humanize(raw);
    }
  }

  private humanize(text: string): string {
    return text
      .replace(/["\[\]]/g, '')
      .replace(/[_\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      || 'Ha ocurrido un error.';
  }
}
