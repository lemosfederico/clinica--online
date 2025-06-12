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
  const supa         = inject(SupabaseService);
  const router       = inject(Router);
  const requiredRole = route.data['role'] as string;

  const session = await firstValueFrom(supa.session$);
  if (!session?.user) return router.parseUrl('/login');

  const { data: profile, error } = await supa
    .from('profiles')
    .select('role,approved')
    .eq('user_id', session.user.id)
    .single();

  if (error || !profile) return router.parseUrl('/login');

  if (
    (requiredRole === 'admin' && profile.role === 'admin') ||
    (requiredRole === 'paciente' && profile.role === 'paciente') ||
    (requiredRole === 'especialista' && profile.role === 'especialista' && profile.approved)
  ) {
    return true;
  }

  return router.parseUrl('/login');
};
