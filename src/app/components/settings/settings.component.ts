import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../state/session.store';
import { ThemeService } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';
import { getCurrentUser, fetchUserAttributes, fetchAuthSession, signOut } from 'aws-amplify/auth';

interface UserInfo {
  username: string;
  name?: string;
  email?: string;
  picture?: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div class="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto animate-fade-in">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold text-[var(--c-text-headings)]">Settings</h1>
    <a routerLink="/selector" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors">
      <i class="fa-solid fa-arrow-left"></i>
      <span>Back to Practice</span>
    </a>
  </div>

  <div class="space-y-8">
    <!-- User Info -->
    @if (userInfo()) {
      <div class="bg-[var(--c-bg-surface)] p-6 rounded-lg shadow-sm border border-[var(--c-border-subtle)]">
        <h2 class="text-xl font-semibold mb-4 text-[var(--c-text-headings)]">Account</h2>
        <div class="flex items-center gap-4 mb-4">
          <!-- Avatar -->
          @if (userInfo()!.picture) {
            <img [src]="userInfo()!.picture" [alt]="userInfo()!.name || 'User avatar'" class="w-16 h-16 rounded-full border-2 border-[var(--c-border-subtle)]">
          } @else {
            <div class="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-[var(--c-border-subtle)]">
              {{ getInitials() }}
            </div>
          }
          <!-- User Details -->
          <div class="flex-1">
            @if (userInfo()!.name) {
              <h3 class="text-lg font-semibold text-[var(--c-text-headings)]">{{ userInfo()!.name }}</h3>
            }
            @if (userInfo()!.email) {
              <p class="text-sm text-[var(--c-text-muted)] mt-1">{{ userInfo()!.email }}</p>
            }
            @if (!userInfo()!.name && !userInfo()!.email) {
              <p class="text-sm text-[var(--c-text-muted)]">{{ userInfo()!.username }}</p>
            }
          </div>
        </div>
        <div class="pt-4 border-t border-[var(--c-border-subtle)]">
          <button 
            (click)="handleSignOut()" 
            class="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2">
            <i class="fa-solid fa-sign-out-alt"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    }

    <!-- Language & Difficulty Settings -->
    <div class="bg-[var(--c-bg-surface)] p-6 rounded-lg shadow-sm border border-[var(--c-border-subtle)]">
      <h2 class="text-xl font-semibold mb-4 text-[var(--c-text-headings)]">Learning Path</h2>
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <span class="text-[var(--c-text-muted)]">Native Language</span>
          @if (sourceLanguage(); as lang) {
            <span class="font-medium text-[var(--c-text-body)] flex items-center gap-2">
              <span class="fi fi-{{ lang.flag }} rounded-sm"></span>
              {{ lang.display_name }}
            </span>
          }
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[var(--c-text-muted)]">Target Language</span>
          @if (targetLanguage(); as lang) {
            <span class="font-medium text-[var(--c-text-body)] flex items-center gap-2">
              <span class="fi fi-{{ lang.flag }} rounded-sm"></span>
              {{ lang.display_name }}
            </span>
          }
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[var(--c-text-muted)]">Difficulty Level</span>
          <span class="font-medium text-[var(--c-text-body)]">{{ difficultyLevel() }}</span>
        </div>
      </div>
      <div class="mt-6 pt-6 border-t border-[var(--c-border-subtle)]">
        <button (click)="resetSettings()" class="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md bg-sky-500 text-white hover:bg-sky-600 transition-colors">
          Change Languages or Difficulty
        </button>
      </div>
    </div>

    <!-- App Settings -->
    <div class="bg-[var(--c-bg-surface)] p-6 rounded-lg shadow-sm border border-[var(--c-border-subtle)]">
      <h2 class="text-xl font-semibold mb-4 text-[var(--c-text-headings)]">Application</h2>
      <div class="space-y-4">
        <!-- Theme Toggle -->
        <div class="flex justify-between items-center">
          <label for="theme-toggle" class="text-[var(--c-text-muted)]">Theme</label>
          <div class="flex items-center gap-3">
            <i class="fa-solid fa-sun text-yellow-500"></i>
            <button
              id="theme-toggle"
              (click)="toggleTheme()"
              type="button"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 bg-slate-300 dark:bg-slate-600"
              role="switch"
              [attr.aria-checked]="theme() === 'dark'">
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                [class.translate-x-5]="theme() === 'dark'"
                [class.translate-x-0]="theme() === 'light'"></span>
            </button>
            <i class="fa-solid fa-moon text-sky-400"></i>
          </div>
        </div>

        <!-- Font Size Slider -->
        <div class="flex justify-between items-center">
            <label for="font-size-slider" class="text-[var(--c-text-muted)]">Reading Text Size</label>
            <div class="flex items-center gap-3 w-full max-w-[14rem]">
                <i class="fa-solid fa-font text-[var(--c-text-muted)] text-xs"></i>
                <input 
                    id="font-size-slider"
                    type="range" 
                    min="16" 
                    max="32" 
                    step="1" 
                    [value]="readingFontSize()" 
                    (input)="onFontSizeChange($event)"
                    class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                    aria-label="Adjust text size">
                <span class="font-mono text-sm text-[var(--c-text-muted)] w-6 text-right">{{ readingFontSize() }}px</span>
            </div>
        </div>


        <!-- Mock API Toggle -->
        @if (isDevMode) {
          <div class="flex justify-between items-center">
            <label for="mock-api-toggle" class="text-[var(--c-text-muted)]">
              Mock API Mode
              <span class="text-xs ml-1">(Dev Only)</span>
            </label>
            <button
              id="mock-api-toggle"
              (click)="toggleMockApi()"
              type="button"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              [class.bg-sky-500]="mockApiMode()"
              [class.bg-slate-300]="!mockApiMode()"
              role="switch"
              [attr.aria-checked]="mockApiMode()">
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                [class.translate-x-5]="mockApiMode()"
                [class.translate-x-0]="!mockApiMode()"></span>
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Admin Section -->
    @if (isAdmin()) {
      <div class="bg-[var(--c-bg-surface)] p-6 rounded-lg shadow-sm border border-[var(--c-border-subtle)]">
        <h2 class="text-xl font-semibold mb-4 text-[var(--c-text-headings)]">Administration</h2>
        <div class="space-y-4">
          <a 
            routerLink="/cost-summary" 
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors">
            <i class="fa-solid fa-chart-line"></i>
            <span>View Cost Summary</span>
          </a>
        </div>
      </div>
    }
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  store = inject(SessionStore);
  themeService = inject(ThemeService);
  languageService = inject(LanguageService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  readonly sourceLanguage = this.store.sourceLanguage;
  readonly targetLanguage = this.store.targetLanguage;
  readonly difficultyLevel = this.store.difficultyLevel;
  readonly theme = this.themeService.theme;
  readonly mockApiMode = this.store.mockApiMode;
  readonly readingFontSize = this.store.readingFontSize;
  readonly isDevMode = this.languageService.isDevMode;

  userInfo = signal<UserInfo | null>(null);
  isAdmin = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadUserInfo();
  }

  /**
   * Decode JWT token payload
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  }

  private async loadUserInfo(): Promise<void> {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      const info: UserInfo = {
        username: user.username,
        email: attributes.email,
        name: attributes.name || attributes.given_name || (attributes as any)['custom:name'],
        picture: attributes.picture || (attributes as any)['custom:picture']
      };

      // Check if user is admin via Cognito groups
      try {
        console.log('[Settings] Checking admin status...');
        const session = await fetchAuthSession();
        console.log('[Settings] Session:', session);
        console.log('[Settings] Session tokens:', session.tokens);
        
        const idToken = session.tokens?.idToken;
        console.log('[Settings] ID Token:', idToken);
        console.log('[Settings] ID Token type:', typeof idToken);
        
        if (idToken) {
          const tokenString = typeof idToken === 'string' ? idToken : idToken.toString();
          console.log('[Settings] Token string length:', tokenString.length);
          
          const payload = this.decodeJWT(tokenString);
          console.log('[Settings] Decoded payload:', payload);
          console.log('[Settings] Payload keys:', payload ? Object.keys(payload) : 'null');
          
          const groups = payload?.['cognito:groups'] || [];
          console.log('[Settings] Cognito groups:', groups);
          console.log('[Settings] Groups type:', typeof groups, 'Is array:', Array.isArray(groups));
          console.log('[Settings] Checking if groups includes "admins":', groups.includes('admins'));
          
          // Also check other possible group field names
          if (payload) {
            console.log('[Settings] All payload fields with "group" or "admin":', 
              Object.keys(payload).filter(key => 
                key.toLowerCase().includes('group') || 
                key.toLowerCase().includes('admin')
              )
            );
          }
          
          if (Array.isArray(groups) && groups.includes('admins')) {
            console.log('[Settings] User is admin, setting isAdmin to true');
            this.isAdmin.set(true);
          } else {
            console.log('[Settings] User is not admin');
          }
        } else {
          console.log('[Settings] No ID token found');
        }
      } catch (adminCheckError) {
        console.error('[Settings] Failed to check admin status:', adminCheckError);
      }

      this.userInfo.set(info);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  }

  getInitials(): string {
    const info = this.userInfo();
    if (!info) return '?';

    if (info.name) {
      const parts = info.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }

    if (info.email) {
      return info.email[0].toUpperCase();
    }

    return info.username[0].toUpperCase();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleMockApi(): void {
    this.store.toggleMockApiMode();
  }

  resetSettings(): void {
    this.router.navigate(['/wizard']);
  }

  onFontSizeChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.setReadingFontSize(Number(value));
  }

  async handleSignOut(): Promise<void> {
    try {
      await signOut();
      // Redirect to home page after sign out
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }
}
