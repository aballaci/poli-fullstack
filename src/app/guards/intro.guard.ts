import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { SessionStore } from '../state/session.store';

export const introGuard: CanActivateFn = () => {
  const store = inject(SessionStore);

  // Always allow access - intro can be shown via help button if needed
  return true;
};
