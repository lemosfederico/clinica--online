import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private _session = new BehaviorSubject<Session | null>(null);
  readonly session$ = this._session.asObservable();

  

  // Nombre del bucket donde guardamos los avatares
  private readonly avatarBucket = 'avatars';
  private readonly perfilesBucket = 'perfiles';

  constructor() {
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

    // Inicializa sesión
    this.supabase.auth.getSession()
      .then(({ data: { session } }) => this._session.next(session));

    // Actualiza sesión al cambiar estado de auth
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
  /**
   * Genera la URL pública de un path interno en el bucket de avatares
   */
  getAvatarPublicUrl(path: string): string {
    return this.supabase
      .storage
      .from(this.avatarBucket)
      .getPublicUrl(path)
      .data
      .publicUrl;
  }

  // --- Storage / Query Helpers ---
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
   * Crea un usuario en Auth, sube su avatar (si lo hay) y crea el perfil en profiles
   */
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
      data: { user },
      error: authError
    } = await this.supabase.auth.signUp({ email: data.email, password: data.password });
    if (authError) throw authError;
    if (!user) throw new Error('No se creó el usuario en Auth');

    // 2) Subir avatar y construir array de URLs
    let imageUrls: string[] = [];
    if (data.avatarFile) {
      const file = data.avatarFile;
      const filePath = `${this.avatarBucket}/${user.id}_${file.name}`;

      const { error: uploadError } = await this.supabase
        .storage
        .from(this.avatarBucket)
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Obtener URL pública y guardarla en un array
      const publicUrl = this.getAvatarPublicUrl(filePath);
      imageUrls = [publicUrl];
    }

    // 3) Insertar perfil en la tabla profiles
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
    if (profileError) throw profileError;

    return user;
  }

  
}
