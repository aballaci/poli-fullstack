import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../state/session.store';

export const conversationGuard: CanActivateFn = () => {
  const store = inject(SessionStore);
  const router = inject(Router);

  if (store.activeScenario()) {
    return true;
  }

  // Redirect to the scenario selector page if there's no active scenario
  return router.parseUrl('/selector');
};