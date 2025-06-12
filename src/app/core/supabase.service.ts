// src/app/core/supabase.service.ts
import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  Session
} from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private _session = new BehaviorSubject<Session | null>(null);
  readonly session$ = this._session.asObservable();
  client: any;

   constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          // evita que use navigator.locks y multi-tab
          persistSession: true,
          autoRefreshToken: true
        }
      }
    );


    // Inicializa session$
    this.supabase.auth.getSession()
      .then(({ data: { session } }) => this._session.next(session));

    // Actualiza session$ cuando cambie el estado de auth
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._session.next(session);
    });
  }

  // --- Auth ---
  signUp(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }
  signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }
  signOut() {
    return this.supabase.auth.signOut();
  }

  getClient() {
    return this.supabase;
  }

  // --- Storage ---
  getStorage() {
    return this.supabase.storage;
  }

  // --- Postgres queries ---
  /** Devuelve el query builder de la tabla que indiques */
  /** Devuelve el query builder de la tabla que indiques */
   /** Aquí está el método que debes usar */
  from(table: string) {
    return this.supabase.from(table);
  }

}
