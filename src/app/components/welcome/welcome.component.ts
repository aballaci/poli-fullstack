import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionStore } from '../../state/session.store';
import { IntroComponent } from '../intro/intro.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, IntroComponent],
  templateUrl: './welcome.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
  store = inject(SessionStore);
  router = inject(Router);

  dontShowIntroAgain = signal(false);

  onDontShowAgainChange(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.dontShowIntroAgain.set(isChecked);
  }

  proceedToApp(): void {
    if (this.dontShowIntroAgain()) {
      this.store.setIntroSeen(true);
    }
    this.router.navigate(['/selector']);
  }
}
