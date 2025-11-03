import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import { CommonModule } from '@angular/common';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from './state/session.store';
import { ThemeService } from './services/theme.service';

Amplify.configure(outputs);

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, RouterLink, CommonModule, AmplifyAuthenticatorModule],
})
export class AppComponent {
  title = 'amplify-angular-template';
  store = inject(SessionStore);
  themeService = inject(ThemeService); // to initialize it
  router = inject(Router);

  constructor(public authenticator: AuthenticatorService) {
    Amplify.configure(outputs);
    this.initializeS3Url();
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
}
