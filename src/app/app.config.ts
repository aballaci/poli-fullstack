import { ApplicationConfig, isDevMode, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { translocoConfig } from './transloco.config';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    translocoConfig,
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        return () => {
          if (!isDevMode() && 'serviceWorker' in navigator) {
            console.log('[ServiceWorker] Service worker support detected');
            console.log('[ServiceWorker] Registration will occur when app is stable (after 30s)');

            // Listen for service worker registration
            navigator.serviceWorker.ready.then(registration => {
              console.log('[ServiceWorker] Service worker registered successfully');
              console.log('[ServiceWorker] Scope:', registration.scope);
              console.log('[ServiceWorker] Active:', !!registration.active);
              console.log('[ServiceWorker] Waiting:', !!registration.waiting);
              console.log('[ServiceWorker] Installing:', !!registration.installing);
            }).catch(error => {
              console.error('[ServiceWorker] Service worker registration failed:', error);
            });

            // Listen for controller changes
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              console.log('[ServiceWorker] Controller changed - new service worker activated');
            });

            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
              console.log('[ServiceWorker] Message received:', event.data);
            });
          } else if (isDevMode()) {
            console.log('[ServiceWorker] Service worker disabled in development mode');
          } else {
            console.warn('[ServiceWorker] Service worker not supported in this browser');
          }
        };
      },
      multi: true
    }
  ]
};
