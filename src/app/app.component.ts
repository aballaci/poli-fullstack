import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import { CommonModule } from '@angular/common';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { IntroComponent } from './components/intro/intro.component';
import { Router, RouterModule } from '@angular/router';
import { SessionStore } from './state/session.store';
import { ThemeService } from './services/theme.service';

Amplify.configure(outputs);

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
    imports: [RouterOutlet, CommonModule, IntroComponent, AmplifyAuthenticatorModule],
})
export class AppComponent {
  title = 'amplify-angular-template';
  store = inject(SessionStore);
  themeService = inject(ThemeService); // to initialize it
  router = inject(Router);

  showIntro = signal(false);
  dontShowIntroAgain = signal(false);
    
  constructor(public authenticator: AuthenticatorService) {
    Amplify.configure(outputs);
    this.initializeS3Url();
    if (!this.store.introSeen()) {
      this.showIntro.set(true);
    }
  }

   private async initializeS3Url(): Promise<void> {
    try {
        const response = await fetch('./amplify_outputs.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch amplify_outputs.json: ${response.statusText}`);
        }
        const outputs = await response.json();
        const storageConfig = outputs.storage;
        if (storageConfig && storageConfig.bucket_name && storageConfig.aws_region) {
            const s3BaseUrl = `https://${storageConfig.bucket_name}.s3.${storageConfig.aws_region}.amazonaws.com/public/`;
            this.store.setS3BaseUrl(s3BaseUrl);
        } else {
            console.error('Could not find storage configuration in amplify_outputs.json');
        }
    } catch (err) {
        console.error('[AppComponent] Failed to initialize S3 URL.', { error: err });
    }
  }
  
  closeIntro(): void {
    if (this.dontShowIntroAgain()) {
      this.store.setIntroSeen(true);
    }
    this.showIntro.set(false);
  }

  onDontShowAgainChange(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.dontShowIntroAgain.set(isChecked);
  }
}
