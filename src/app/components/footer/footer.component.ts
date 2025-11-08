import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ViewportScroller } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private router = inject(Router);
  private viewportScroller = inject(ViewportScroller);

  scrollToTop(route: string, event: Event): void {
    event.preventDefault();
    this.router.navigate([route]).then(() => {
      // Always scroll to top after navigation
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.viewportScroller.scrollToPosition([0, 0]);
    }).catch(() => {
      // If navigation fails, still scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.viewportScroller.scrollToPosition([0, 0]);
    });
  }
}

