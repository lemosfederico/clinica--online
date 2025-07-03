// src/app/core/supabase.service.ts

import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  Session,
  PostgrestError
} from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  public supabase: SupabaseClient;
  private _session = new BehaviorSubject<Session | null>(null);
  readonly session$ = this._session.asObservable();

  // Bucket para avatares
  private readonly avatarBucket = 'avatars';

  constructor(private errorService: ErrorService) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      }
    );

    // Inicializar sesión
    this.supabase.auth
      .getSession()
      .then(({ data: { session } }) => this._session.next(session));

    // Escuchar cambios de auth
    this.supabase.auth.onAuthStateChange((_, session) => {
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

  // --- Helpers ---
  /** URL pública de un path en el bucket de avatares */
  getAvatarPublicUrl(path: string): string {
    return this.supabase
      .storage
      .from(this.avatarBucket)
      .getPublicUrl(path)
      .data
      .publicUrl;
  }

  getClient() {
    return this.supabase;
  }

  getStorage() {
    return this.supabase.storage;
  }

  from(table: string) {
  return this.supabase.from(table);
}

  /**
   * Envuelve cualquier builder de PostgREST (select, upsert, insert…) y
   * traduce el error a castellano usando ErrorService
   */
  private async exec<T>(
    builder: any
  ): Promise<{ data: T[] | null; error: string | null }> {
    const { data, error }: { data: T[] | null; error: PostgrestError | null } =
      await builder;
    if (error) {
      console.error('[Supabase]', error);
      return {
        data: null,
        error: this.errorService.translate(error)
      };
    }
    return { data, error: null };
  }

  /**
   * SELECT simple con filtros { columna: valor }
   */
  async select<T>(
    table: string,
    columns = '*',
    filters: Record<string, any> = {}
  ): Promise<{ data: T[] | null; error: string | null }> {
    let qb = this.supabase.from(table).select(columns);
    for (const [col, val] of Object.entries(filters)) {
      qb = qb.eq(col, val);
    }
    return this.exec<T>(qb);
  }

  /**
   * UPSERT con onConflict opcional
   */
  async upsert<T>(
    table: string,
    rows: T[],
    onConflict?: string
  ): Promise<{ data: T[] | null; error: string | null }> {
    let qb = this.supabase.from(table).upsert<T>(rows);
    if (onConflict) {
      // Casting a any porque TS no expone onConflict en tipos públicos
      qb = (qb as any).onConflict(onConflict);
    }
    return this.exec<T>(qb);
  }

  // --- Ejemplo compuesto: crear usuario + perfil + avatar ---
  async createUser(data: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    edad: number;
    dni: string;
    role: 'especialista' | 'admin';
    avatarFile?: File;
  }) {
    // 1) Registrar en Auth
    const {
      data: signUpData,
      error: authError
    } = await this.supabase.auth.signUp({
      email: data.email,
      password: data.password
    });
    if (authError) {
      throw new Error(this.errorService.translate(authError));
    }
    const user = signUpData.user;
    if (!user) {
      throw new Error('No se creó el usuario en Auth');
    }

    // 2) Subir avatar (si existe)
    let imageUrls: string[] = [];
    if (data.avatarFile) {
      const filePath = `${this.avatarBucket}/${user.id}_${data.avatarFile.name}`;
      const { error: uploadError } = await this.supabase
        .storage
        .from(this.avatarBucket)
        .upload(filePath, data.avatarFile);
      if (uploadError) {
        // Para errores de Storage usamos directamente el message
        throw new Error(uploadError.message);
      }
      imageUrls = [this.getAvatarPublicUrl(filePath)];
    }

    // 3) Insertar perfil en la tabla "profiles"
    const { error: profileError } = await this.supabase
      .from('profiles')
      .insert({
        user_id:    user.id,
        nombre:     data.nombre,
        apellido:   data.apellido,
        edad:       data.edad,
        dni:        data.dni,
        role:       data.role,
        approved:   true,
        image_urls: imageUrls
      });
    if (profileError) {
      throw new Error(this.errorService.translate(profileError));
    }

    return user;
  }

  async upsertHistoria(hist: {
    turno_id:    number;
    paciente_id: string;
    altura:      number;
    peso:        number;
    temperatura: number;
    presion:     string;
    detalles:    { clave: string; valor: string }[];
  }): Promise<{ error: string | null }> {
    const client = this.getClient();

    // 1) Hacemos upsert con onConflict('turno_id')
    const { data: upData, error: upErr } = await client
      .from('historia_clinica')
      .upsert(
        {
          turno_id:    hist.turno_id,
          paciente_id: hist.paciente_id,
          altura:      hist.altura,
          peso:        hist.peso,
          temperatura: hist.temperatura,
          presion:     hist.presion
        },
        { onConflict: 'turno_id' } as any   // TS workaround
      )
      .select('id')
      .single();

    if (upErr) {
      console.error('[Supabase] upsertHistoria.upErr', upErr);
      return { error: this.errorService.translate(upErr) };
    }

    const historiaId = upData.id;

    // 2) Borramos todos los detalles viejos
    const { error: delErr } = await client
      .from('historia_detalles')
      .delete()
      .eq('historia_id', historiaId);

    if (delErr) {
      console.error('[Supabase] upsertHistoria.delErr', delErr);
      return { error: this.errorService.translate(delErr) };
    }

    // 3) Insertamos los nuevos detalles
    if (hist.detalles.length) {
      const rows = hist.detalles.map(d => ({
        historia_id: historiaId,
        clave:       d.clave,
        valor:       d.valor
      }));
      const { error: insDetErr } = await client
        .from('historia_detalles')
        .insert(rows);

      if (insDetErr) {
        console.error('[Supabase] upsertHistoria.insDetErr', insDetErr);
        return { error: this.errorService.translate(insDetErr) };
      }
    }

    return { error: null };
  }

  async getHistoriaByPaciente(pacienteId: string): Promise<{
    data: {
      id: string;
      paciente_id: string;
      altura: number;
      peso: number;
      temperatura: number;
      presion: string;
      fecha_creacion: string;
      historia_detalles: { clave: string; valor: string }[];
    } | null;
    error: string | null;
  }> {
    // Usamos maybeSingle() para que 0 filas no sea error
    const { data, error }: {
      data: any | null;
      error: PostgrestError | null;
    } = await this.getClient()
      .from('historia_clinica')
      .select(`
        id,
        paciente_id,
        altura,
        peso,
        temperatura,
        presion,
        fecha_creacion,
        historia_detalles (clave, valor)
      `)
      .eq('paciente_id', pacienteId)
      .maybeSingle();    // <-- aquí

    if (error) {
      console.error('[Supabase] getHistoriaByPaciente error:', error);
      // traducimos y devolvemos mensaje
      return { data: null, error: this.errorService.translate(error) };
    }

    // data será null si no existe historia; no es un error
    return { data, error: null };
  }
    // en supabase.service.ts
  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('nombre,apellido')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  }
  }

