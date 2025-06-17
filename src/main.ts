// src/main.ts

// ─── Polyfill para Navigator.locks (para supabase-js v2) ───────────────────
if (!('locks' in navigator)) {
  (navigator as any).locks = {
    async request<T>(
      _name: string,
      callback: () => Promise<T> | T
    ): Promise<T> {
      // Ejecuta directamente el callback sin bloquear nada
      return await callback();
    }
  };
}
// ────────────────────────────────────────────────────────────────────────────

import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations }  from '@angular/platform-browser/animations';

import { environment }        from './environments/environment';
import { routes }            from './app/app.routes';
import { AppComponent }       from './app/app.component';
import { loadingInterceptor } from './app/core/loading.interceptor';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    // HTTP client con nuestro interceptor funcional
    provideHttpClient(withInterceptors([loadingInterceptor])),
    // Importar módulo de spinner
    importProvidersFrom(MatProgressSpinnerModule),
    // Router y animaciones
    provideRouter(routes),
    provideAnimations(),

]
})
.catch(err => console.error(err));
