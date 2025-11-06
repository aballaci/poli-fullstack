import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import { CommonModule } from '@angular/common';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { RouterLink } from '@angular/router';
import { SessionStore } from './state/session.store';
import { ThemeService } from './services/theme.service';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';

Amplify.configure(outputs);

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, RouterLink, CommonModule, AmplifyAuthenticatorModule, HeaderComponent, FooterComponent],
})
export class AppComponent {
  title = 'amplify-angular-template';
  store = inject(SessionStore);
  themeService = inject(ThemeService); // to initialize it
  router = inject(Router);

  // Track current route to determine if authentication is needed
  private navigationEnd$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd)
  );
  currentUrl = toSignal(
    this.navigationEnd$,
    {
      initialValue: { url: this.router.url, urlAfterRedirects: this.router.url } as NavigationEnd
    }
  );

  // Routes that don't require authentication
  private publicRoutes = ['/home', '/intro', '/help-center', '/contact-us', '/privacy-policy', '/terms-of-service'];

  needsAuth = computed(() => {
    const navEnd = this.currentUrl();
    const url = navEnd?.urlAfterRedirects || navEnd?.url || this.router.url;
    return !this.publicRoutes.some(route => url.startsWith(route));
  });

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
