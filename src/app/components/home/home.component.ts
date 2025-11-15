import { ChangeDetectionStrategy, Component, inject, OnInit, AfterViewInit, OnDestroy, signal } from '@angular/core';
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
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  router = inject(Router);
  route = inject(ActivatedRoute);
  store = inject(SessionStore);

  // Hero image rotation
  private readonly heroImagesOriginal = [
    { src: '/assets/spanish-madrid.jpg', alt: 'Learn Spanish - Plaza Mayor in Madrid', language: 'Spanish', flag: 'es', phrase: '¡Hola amigo!' },
    { src: '/assets/paris.webp', alt: 'Learn French - Eiffel Tower in Paris', language: 'French', flag: 'fr', phrase: 'Bonjour!' },
    { src: '/assets/german-berlin.jpg', alt: 'Learn German - Brandenburg Gate in Berlin', language: 'German', flag: 'de', phrase: 'Guten Tag!' },
    { src: '/assets/italian-rome.jpg', alt: 'Learn Italian - Colosseum in Rome', language: 'Italian', flag: 'it', phrase: 'Ciao bella!' },
    { src: '/assets/japan.webp', alt: 'Learn Japanese - Temples in Tokyo', language: 'Japanese', flag: 'jp', phrase: 'こんにちは!' },
    { src: '/assets/chinese-beijing.jpg', alt: 'Learn Chinese - Temple of Heaven in Beijing', language: 'Chinese', flag: 'cn', phrase: '你好!' },
    { src: '/assets/portuguese-lisbon.jpg', alt: 'Learn Portuguese - Trams in Lisbon', language: 'Portuguese', flag: 'pt', phrase: 'Olá!' },
    { src: '/assets/arabic-cairo.jpg', alt: 'Learn Arabic - Pyramids of Giza in Cairo', language: 'Arabic', flag: 'sa', phrase: 'مرحبا!' }
  ];

  private shuffledImages: typeof this.heroImagesOriginal = [];
  private currentImageIndex = 0;
  currentHeroImage = signal(this.heroImagesOriginal[0]);
  private imageRotationInterval?: number;

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

    // Shuffle images once at the beginning
    this.shuffleImages();

    // Start hero image rotation
    this.startImageRotation();
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

  /**
   * Shuffle the images array once using Fisher-Yates algorithm
   */
  private shuffleImages(): void {
    this.shuffledImages = [...this.heroImagesOriginal];
    for (let i = this.shuffledImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledImages[i], this.shuffledImages[j]] = [this.shuffledImages[j], this.shuffledImages[i]];
    }
    // Set the first image from the shuffled array
    this.currentHeroImage.set(this.shuffledImages[0]);
    this.currentImageIndex = 0;
  }

  private startImageRotation(): void {
    // Rotate through shuffled images every 6 seconds
    this.imageRotationInterval = window.setInterval(() => {
      // Move to next image in the shuffled array
      this.currentImageIndex = (this.currentImageIndex + 1) % this.shuffledImages.length;
      this.currentHeroImage.set(this.shuffledImages[this.currentImageIndex]);
    }, 6000);
  }

  ngOnDestroy(): void {
    // Clean up interval
    if (this.imageRotationInterval) {
      clearInterval(this.imageRotationInterval);
    }
  }
}

