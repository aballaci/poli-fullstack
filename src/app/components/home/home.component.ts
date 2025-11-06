import { ChangeDetectionStrategy, Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { getCurrentUser } from 'aws-amplify/auth';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { SessionStore } from '../../state/session.store';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, AfterViewInit {
  router = inject(Router);
  route = inject(ActivatedRoute);
  store = inject(SessionStore);

  // Map language names to language codes (matching available languages in service)
  private languageCodeMap: { [key: string]: string } = {
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Portuguese': 'pt'
    // Note: Japanese, Chinese, and Arabic are not in the available languages service yet
  };

  async navigateToApp(): Promise<void> {
    // Check if language is configured first
    if (!this.store.isConfigured()) {
      // If not configured, go to wizard to set up language
      this.router.navigate(['/wizard']);
      return;
    }

    try {
      // Check if user is authenticated
      await getCurrentUser();
      // If authenticated and configured, go to selector
      this.router.navigate(['/selector']);
    } catch {
      // If not authenticated but configured, still go to wizard (which will handle auth)
      // The wizard will skip language selection since it's already configured
      this.router.navigate(['/wizard']);
    }
  }

  navigateToLanguageWizard(languageName: string): void {
    const languageCode = this.languageCodeMap[languageName];
    if (languageCode) {
      this.router.navigate(['/wizard'], { queryParams: { target: languageCode } });
    } else {
      // Fallback to regular navigation
      this.navigateToApp();
    }
  }

  ngOnInit(): void {
    // Handle fragment navigation
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        setTimeout(() => this.scrollToFragment(fragment), 100);
      }
    });
  }

  ngAfterViewInit(): void {
    // Handle initial fragment if present
    const fragment = this.route.snapshot.fragment;
    if (fragment) {
      setTimeout(() => this.scrollToFragment(fragment), 100);
    }
  }

  private scrollToFragment(fragment: string): void {
    const element = document.getElementById(fragment);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

