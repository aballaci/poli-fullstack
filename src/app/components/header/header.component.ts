import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { SessionStore } from '../../state/session.store';
import { ThemeService } from '../../services/theme.service';
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

  targetLanguage = this.store.targetLanguage;
  theme = this.themeService.theme;

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
}

