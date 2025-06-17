import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from './supabase.service';

export const roleGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean | UrlTree> => {
  const supa   = inject(SupabaseService);
  const router = inject(Router);

  // Leer rol(es) permitidos: string o string[]
  const raw = route.data['role'] as string | string[];
  const allowedRoles = Array.isArray(raw) ? raw : [raw];

  // 1) Sesión
  const session = await firstValueFrom(supa.session$);
  if (!session?.user) {
    return router.parseUrl('/login');
  }

  // 2) Traer perfil
  const { data: profile, error } = await supa
    .from('profiles')
    .select('role,approved')
    .eq('user_id', session.user.id)
    .single();

  if (error || !profile) {
    return router.parseUrl('/login');
  }

  // 3) Verificar rol
  if (!allowedRoles.includes(profile.role)) {
    return router.parseUrl('/login');
  }

  // 4) Si es especialista, debe además estar aprobado
  if (profile.role === 'especialista' && !profile.approved) {
    return router.parseUrl('/login');
  }

  // OK
  return true;
};
