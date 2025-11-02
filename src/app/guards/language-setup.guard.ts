import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../state/session.store';

export const languageSetupGuard: CanActivateFn = () => {
  const store = inject(SessionStore);
  const router = inject(Router);

  if (store.isConfigured()) {
    return true;
  }

  // Redirect to the wizard if the app is not configured
  return router.parseUrl('/wizard');
};