// FIX: Add @Injectable decorator to make the service injectable.
import { Injectable, isDevMode } from '@angular/core';
import { Language } from '../models';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly availableLanguages: Language[] = [
    { code: 'en', display_name: 'English', flag: 'gb' },
    { code: 'es', display_name: 'Spanish', flag: 'es' },
    { code: 'fr', display_name: 'French', flag: 'fr' },
    { code: 'de', display_name: 'German', flag: 'de' },
    { code: 'it', display_name: 'Italian', flag: 'it' },
    { code: 'pt', display_name: 'Portuguese', flag: 'pt' },
  ];
  
  readonly difficultyLevels: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

  // Dev mode check is still useful for components that might show dev-only UI.
  readonly isDevMode = isDevMode();

}