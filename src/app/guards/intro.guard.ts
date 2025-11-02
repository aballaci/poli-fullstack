import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../state/session.store';

export const introGuard: CanActivateFn = () => {
  const store = inject(SessionStore);
  const router = inject(Router);

  if (store.introSeen()) {
    return true;
  }

  // Redirect to the welcome page if intro has not been seen.
  return router.parseUrl('/welcome');
};
