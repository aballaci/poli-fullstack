import { ChangeDetectionStrategy, Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { getCurrentUser } from 'aws-amplify/auth';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

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

  async navigateToApp(): Promise<void> {
    try {
      // Check if user is authenticated
      await getCurrentUser();
      // If authenticated, go to selector
      this.router.navigate(['/selector']);
    } catch {
      // If not authenticated, go to wizard (which will handle auth)
      this.router.navigate(['/wizard']);
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

