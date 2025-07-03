// src/app/route-animations.ts
import {
  trigger,
  transition,
  style,
  animate,
  query,
  group
} from '@angular/animations';

export const slideInAnimation = trigger('slideInAnimation', [
  transition('* <=> *', [
    // aplica posición fija para enter y leave
    query(':enter, :leave', style({ position: 'absolute', width: '100%' }), { optional: true }),
    group([
      // elemento entrante entra desde la derecha
      query(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0%)' }))
      ], { optional: true }),
      // elemento saliente sale hacia la izquierda
      query(':leave', [
        style({ transform: 'translateX(0%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(-100%)' }))
      ], { optional: true })
    ])
  ])
]);

export const fadeAnimation = trigger('fadeAnimation', [
  transition('* <=> *', [
    // fade in
    query(':enter', [
      style({ opacity: 0 }),
      animate('500ms ease-in', style({ opacity: 1 }))
    ], { optional: true }),
    // fade out
    query(':leave', [
      style({ opacity: 1 }),
      animate('500ms ease-out', style({ opacity: 0 }))
    ], { optional: true })
  ])
]);
