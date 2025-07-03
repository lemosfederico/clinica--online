// src/app/app.component.ts
import { Component, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, Event, RouterOutlet } from '@angular/router';
import { NgIf }             from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService }   from './core/loading.service';
import { CommonModule } from '@angular/common';
import { slideInAnimation, fadeAnimation } from './route-animations';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NgIf,
    MatProgressSpinnerModule,
    CommonModule,
    RouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [ slideInAnimation, fadeAnimation ]
})
export class AppComponent {
  
  private router       = inject(Router);
  private loader       = inject(LoadingService);

  // Combina HTTP + navegación
  private navLoading   = false;
  private httpLoading  = false;
  showSpinner          = false;

  // Forzar mínimo display
  private spinnerStart = 0;
  private readonly minDisplay = 500; // ms

  prepareRoute(outlet: RouterOutlet) {
    return outlet.activatedRouteData?.['animation'];
  }
  
  constructor() {
    // HTTP loading
    this.loader.loading$.subscribe(loading => {
      this.httpLoading = loading;
      this.updateSpinner();
    });

    // Router events
    this.router.events.subscribe((e: Event) => {
      if (e instanceof NavigationStart) {
        this.navLoading = true;
        this.updateSpinner();
      }
      if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
        this.navLoading = false;
        this.updateSpinner();
      }
    });
  }

  private updateSpinner() {
    const shouldShow = this.httpLoading || this.navLoading;

    if (shouldShow && !this.showSpinner) {
      // Arranca el spinner
      this.spinnerStart = Date.now();
      this.showSpinner = true;
    }

    if (!shouldShow && this.showSpinner) {
      // Intento de hide: calcula elapsed
      const elapsed = Date.now() - this.spinnerStart;
      const remaining = this.minDisplay - elapsed;
      if (remaining > 0) {
        setTimeout(() => { this.showSpinner = false; }, remaining);
      } else {
        this.showSpinner = false;
      }
    }
  }
}