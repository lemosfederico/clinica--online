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
}
