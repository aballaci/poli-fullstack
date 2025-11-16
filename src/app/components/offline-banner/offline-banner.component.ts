import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineStorageService } from '../../services/offline-storage.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './offline-banner.component.html',
  styleUrl: './offline-banner.component.css'
})
export class OfflineBannerComponent {
  readonly isOffline = this.offlineService.isOffline;
  readonly isDismissed = signal(false);

  constructor(private offlineService: OfflineStorageService) { }

  dismiss(): void {
    this.isDismissed.set(true);
  }
}
