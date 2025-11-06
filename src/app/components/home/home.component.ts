import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
export class HomeComponent {
  router = inject(Router);

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
}

