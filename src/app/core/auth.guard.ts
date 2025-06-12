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

export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean | UrlTree> => {
  const supa   = inject(SupabaseService);
  const router = inject(Router);
  const session = await firstValueFrom(supa.session$);
  return session?.user
    ? true
    : router.parseUrl('/login');
};
