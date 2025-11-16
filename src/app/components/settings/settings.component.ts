import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { SessionStore } from '../../state/session.store';
import { ThemeService } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';
import { OfflineStorageService } from '../../services/offline-storage.service';
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
  imports: [CommonModule, RouterLink, TranslocoModule],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  store = inject(SessionStore);
  themeService = inject(ThemeService);
  languageService = inject(LanguageService);
  offlineService = inject(OfflineStorageService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  readonly sourceLanguage = this.store.sourceLanguage;
  readonly targetLanguage = this.store.targetLanguage;
  readonly difficultyLevel = this.store.difficultyLevel;
  readonly theme = this.themeService.theme;
  readonly mockApiMode = this.store.mockApiMode;
  readonly readingFontSize = this.store.readingFontSize;
  readonly isDevMode = this.languageService.isDevMode;

  // Offline storage
  readonly saveForOfflineEnabled = signal<boolean>(false);
  readonly offlineStorageUsage = this.offlineService.storageUsage;
  readonly savedScenariosCount = computed(() => this.offlineService.savedScenarios().length);

  userInfo = signal<UserInfo | null>(null);
  isAdmin = signal(false);
  isLanguageDropdownOpen = signal(false);

  get availableUiLanguages() {
    return this.languageService.availableUiLanguages;
  }

  currentUiLanguageFlag = () => {
    return this.languageService.getLanguageFlag(this.languageService.uiLanguage());
  };

  currentUiLanguageName = () => {
    return this.languageService.getLanguageDisplayName(this.languageService.uiLanguage());
  };

  async ngOnInit(): Promise<void> {
    await this.loadUserInfo();
    this.saveForOfflineEnabled.set(this.offlineService.getSaveForOfflineEnabled());
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

  toggleLanguageDropdown(): void {
    this.isLanguageDropdownOpen.update(v => !v);
  }

  selectUiLanguage(code: string): void {
    this.languageService.changeLanguage(code);
    this.isLanguageDropdownOpen.set(false);
  }

  toggleSaveForOffline(): void {
    const newValue = !this.saveForOfflineEnabled();
    this.saveForOfflineEnabled.set(newValue);
    this.offlineService.setSaveForOfflineEnabled(newValue);
  }

  async clearOfflineStorage(): Promise<void> {
    // Use a simple confirm for now - translation will be handled by the browser
    if (confirm('Are you sure you want to clear all offline data?')) {
      try {
        await this.offlineService.clearAllOfflineData();
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Failed to clear offline storage:', error);
      }
    }
  }

  formatStorageSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
