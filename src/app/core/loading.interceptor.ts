// src/app/core/loading.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from './loading.service';

export const loadingInterceptor: HttpInterceptorFn =
  (req: HttpRequest<unknown>, next: HttpHandlerFn): import("rxjs").Observable<HttpEvent<unknown>> => {
    const loader = inject(LoadingService);
    loader.show();
    return next(req).pipe(
      finalize(() => loader.hide())
    );
};
