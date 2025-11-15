import { ChangeDetectionStrategy, Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { SessionStore } from '../../state/session.store';
import { ThemeService } from '../../services/theme.service';
import { ViewportService } from '../../services/viewport.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { getCurrentUser } from 'aws-amplify/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoModule, LanguageSwitcherComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  store = inject(SessionStore);
  themeService = inject(ThemeService);
  router = inject(Router);
  viewportService = inject(ViewportService);

  targetLanguage = this.store.targetLanguage;
  theme = this.themeService.theme;

  // Mobile menu state
  mobileMenuOpen = signal<boolean>(false);
  isMobileView = this.viewportService.isMobileOrTablet;

  async navigateToApp(): Promise<void> {
    try {
      await getCurrentUser();
      this.router.navigate(['/selector']);
    } catch {
      this.router.navigate(['/wizard']);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  navigateToLanguageWizard(): void {
    this.router.navigate(['/wizard']);
  }

  /**
   * Toggle mobile menu open/close
   */
  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);

    // Prevent body scroll when menu is open
    if (this.mobileMenuOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
    document.body.style.overflow = '';
  }

  /**
   * Handle clicks outside the mobile menu to close it
   */
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;

    // Check if click is outside mobile menu and hamburger button
    if (this.mobileMenuOpen() &&
      !target.closest('.mobile-menu') &&
      !target.closest('.hamburger-button')) {
      this.closeMobileMenu();
    }
  }

  /**
   * Navigate and close mobile menu
   */
  navigateAndClose(path: string, fragment?: string): void {
    if (fragment) {
      this.router.navigate([path], { fragment });
    } else {
      this.router.navigate([path]);
    }
    this.closeMobileMenu();
  }
}

