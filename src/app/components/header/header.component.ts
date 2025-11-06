import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../state/session.store';
import { ThemeService } from '../../services/theme.service';
import { getCurrentUser } from 'aws-amplify/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  store = inject(SessionStore);
  themeService = inject(ThemeService);
  router = inject(Router);

  async navigateToApp(): Promise<void> {
    try {
      await getCurrentUser();
      this.router.navigate(['/selector']);
    } catch {
      this.router.navigate(['/wizard']);
    }
  }
}

