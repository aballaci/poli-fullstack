import { Injectable, inject, signal, effect } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SessionStore } from '../state/session.store';
import { Language } from '../models';

export interface LanguagePreferences {
  uiLanguage: string;
  immersionMode: boolean;
  learningLanguage?: string;
  systemLanguage?: string;
  lastChanged?: number;
}

export interface UiLanguageDefinition {
  code: string;
  flag: string;
  displayName: string;
  nativeName: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  // Properties for backward compatibility with gemini service
  readonly isDevMode = false; // Set based on environment
  readonly difficultyLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  private readonly STORAGE_KEY = 'language_preferences';
  private readonly UNDO_DURATION = 5000;

  private transloco = inject(TranslocoService);
  private sessionStore = inject(SessionStore);

  // Signals for reactive state
  uiLanguage = signal<string>('en');
  immersionMode = signal<boolean>(false);
  showUndoNotification = signal<boolean>(false);
  previousLanguage = signal<string | null>(null);

  private undoTimer: any = null;

  // Language metadata (code, flag, translation key)
  private readonly languageMetadata = [
    { code: 'en', flag: 'gb', translationKey: 'languages.english' },
    { code: 'it', flag: 'it', translationKey: 'languages.italian' },
    { code: 'es', flag: 'es', translationKey: 'languages.spanish' },
    { code: 'fr', flag: 'fr', translationKey: 'languages.french' },
    { code: 'de', flag: 'de', translationKey: 'languages.german' },
    { code: 'pt', flag: 'pt', translationKey: 'languages.portuguese' },
    { code: 'ja', flag: 'jp', translationKey: 'languages.japanese' },
    { code: 'zh', flag: 'cn', translationKey: 'languages.chinese' },
    { code: 'ar', flag: 'sa', translationKey: 'languages.arabic' }
  ];

  // Available languages for backward compatibility (used by language-wizard)
  // This getter returns languages with translated display names
  get availableLanguages(): Language[] {
    return this.languageMetadata.map(lang => ({
      code: lang.code,
      flag: lang.flag,
      display_name: this.transloco.translate(lang.translationKey)
    }));
  }

  // Available UI languages for translation (subset of availableLanguages)
  readonly availableUiLanguages: UiLanguageDefinition[] = [
    { code: 'en', flag: 'gb', displayName: 'English', nativeName: 'English' },
    { code: 'it', flag: 'it', displayName: 'Italian', nativeName: 'Italiano' },
    { code: 'de', flag: 'de', displayName: 'German', nativeName: 'Deutsch' },
    { code: 'fr', flag: 'fr', displayName: 'French', nativeName: 'Français' },
    { code: 'es', flag: 'es', displayName: 'Spanish', nativeName: 'Español' },
    { code: 'pt', flag: 'pt', displayName: 'Portuguese', nativeName: 'Português' },
    { code: 'ja', flag: 'jp', displayName: 'Japanese', nativeName: '日本語' }
  ];

  constructor() {
    this.initializeLanguage();

    // Save preferences whenever language or immersion mode changes
    effect(() => {
      const lang = this.uiLanguage();
      const immersion = this.immersionMode();
      this.savePreferences();
    });
  }

  /**
   * Initialize language from storage or system detection
   */
  private initializeLanguage(): void {
    const stored = this.loadPreferences();

    if (stored && stored.uiLanguage) {
      // Use stored preference
      console.log(`[LanguageService] Loading stored language: ${stored.uiLanguage}`);
      this.uiLanguage.set(stored.uiLanguage);
      this.immersionMode.set(stored.immersionMode || false);
      this.transloco.setActiveLang(stored.uiLanguage);
    } else {
      // Detect system language
      const systemLang = this.detectSystemLanguage();
      console.log(`[LanguageService] No stored preference found. Detected system language: ${systemLang}`);
      console.log(`[LanguageService] Browser language: ${navigator.language}`);
      console.log(`[LanguageService] Available UI languages: ${this.availableUiLanguages.map(l => l.code).join(', ')}`);
      this.uiLanguage.set(systemLang);
      this.transloco.setActiveLang(systemLang);

      // Save detected system language
      this.savePreferences();
    }
    console.log(`[LanguageService] Active language set to: ${this.transloco.getActiveLang()}`);
  }

  /**
   * Detect browser/system language
   */
  private detectSystemLanguage(): string {
    const browserLang = navigator.language || (navigator as any).userLanguage;
    const langCode = browserLang.split('-')[0].toLowerCase();

    // Check if detected language is supported as UI language
    const isSupported = this.availableUiLanguages.some(lang => lang.code === langCode);

    return isSupported ? langCode : 'en';
  }

  /**
   * Change UI language with undo support
   */
  changeLanguage(lang: string): void {
    console.log(`[LanguageService] changeLanguage called with: ${lang}`);
    console.log(`[LanguageService] Current language: ${this.uiLanguage()}`);

    // Validate language code
    const isValid = this.availableUiLanguages.some(l => l.code === lang);
    console.log(`[LanguageService] Is valid language: ${isValid}`);

    if (!isValid) {
      console.warn(`Invalid language code: ${lang}. Falling back to English.`);
      lang = 'en';
    }

    // Store previous language for undo
    this.previousLanguage.set(this.uiLanguage());

    // Update language
    this.uiLanguage.set(lang);
    this.transloco.setActiveLang(lang);
    console.log(`[LanguageService] Language changed to: ${lang}`);
    console.log(`[LanguageService] Transloco active lang: ${this.transloco.getActiveLang()}`);

    // Show undo notification
    this.showUndoNotification.set(true);

    // Clear existing timer
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
    }

    // Hide notification after duration
    this.undoTimer = setTimeout(() => {
      this.showUndoNotification.set(false);
      this.previousLanguage.set(null);
    }, this.UNDO_DURATION);
  }

  /**
   * Undo language change
   */
  undoLanguageChange(): void {
    const prev = this.previousLanguage();
    if (prev) {
      this.uiLanguage.set(prev);
      this.transloco.setActiveLang(prev);
      this.showUndoNotification.set(false);
      this.previousLanguage.set(null);

      if (this.undoTimer) {
        clearTimeout(this.undoTimer);
        this.undoTimer = null;
      }
    }
  }

  /**
   * Toggle immersion mode
   */
  toggleImmersionMode(): void {
    const newMode = !this.immersionMode();
    this.immersionMode.set(newMode);

    if (newMode) {
      // Enable immersion mode - switch to learning language if available
      const targetLang = this.sessionStore.targetLanguage();
      if (targetLang && targetLang.code) {
        // Check if learning language is supported as UI language
        const isSupported = this.availableUiLanguages.some(l => l.code === targetLang.code);
        if (isSupported) {
          this.previousLanguage.set(this.uiLanguage());
          this.uiLanguage.set(targetLang.code);
          this.transloco.setActiveLang(targetLang.code);
        } else {
          console.warn(`Learning language ${targetLang.code} is not supported as UI language`);
          this.immersionMode.set(false);
        }
      } else {
        console.warn('No learning language set. Cannot enable immersion mode.');
        this.immersionMode.set(false);
      }
    } else {
      // Disable immersion mode - restore previous language
      const prev = this.previousLanguage();
      if (prev) {
        this.uiLanguage.set(prev);
        this.transloco.setActiveLang(prev);
        this.previousLanguage.set(null);
      }
    }
  }

  /**
   * Get language display name
   */
  getLanguageDisplayName(code: string, inLanguage?: string): string {
    const lang = this.availableUiLanguages.find(l => l.code === code);
    if (!lang) return code;

    // For now, return native name. Could be extended to return translated name
    return lang.nativeName;
  }

  /**
   * Get language flag code
   */
  getLanguageFlag(code: string): string {
    const lang = this.availableUiLanguages.find(l => l.code === code);
    return lang?.flag || 'gb';
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    const prefs: LanguagePreferences = {
      uiLanguage: this.uiLanguage(),
      immersionMode: this.immersionMode(),
      systemLanguage: this.detectSystemLanguage(),
      lastChanged: Date.now()
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error('Failed to save language preferences:', error);
    }
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): LanguagePreferences | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load language preferences:', error);
    }
    return null;
  }
}
