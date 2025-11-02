import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const THEME_KEY = 'poli_theme';
export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  
  theme = signal<Theme>(this.loadTheme());

  constructor() {
    // Apply the theme whenever the signal changes.
    effect(() => {
      const currentTheme = this.theme();
      if (isPlatformBrowser(this.platformId)) {
        this.saveTheme(currentTheme);
        // Toggling the class on the root element is standard for Tailwind dark mode.
        document.documentElement.classList.toggle('dark', currentTheme === 'dark');
      }
    });
  }

  private loadTheme(): Theme {
    if (isPlatformBrowser(this.platformId)) {
      const storedTheme = localStorage.getItem(THEME_KEY);
      // Check for a valid stored theme.
      if (storedTheme === 'light' || storedTheme === 'dark') {
          return storedTheme;
      }
      // If no theme is stored, use the user's system preference as the default.
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
      }
    }
    // Default to dark mode.
    return 'dark';
  }

  private saveTheme(theme: Theme): void {
     if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(THEME_KEY, theme);
     }
  }

  toggleTheme(): void {
    this.theme.update(current => (current === 'light' ? 'dark' : 'light'));
  }
}