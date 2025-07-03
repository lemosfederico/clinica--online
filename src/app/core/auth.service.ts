// src/app/core/auth.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Session, User }   from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private supa: SupabaseService) {}

  /** Devuelve el usuario autenticado o null */
  async currentUser(): Promise<User | null> {
    const { data } = await this.supa.getClient().auth.getSession();
    return data.session?.user ?? null;
  }

  /** Cierra sesión */
  signOut() {
    return this.supa.signOut();
  }

  async signIn(email:string, pass:string) {
  const { data, error } = await this.supa.getClient().auth.signInWithPassword({ email, password: pass });
  const localISO = new Date().toLocaleString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
  if (error) throw error;
  
  // Registrar el login en la tabla
  const { error: logError } = await this.supa
    .getClient()
    .from('login_logs')
    .insert([{ user_id: data.user.id, timestamp: localISO }]);

  console.log('Login log insert error:', logError);
  
  return data;
}
}
