import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineStatusService } from '../../services/offline-status.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline-indicator.component.html',
  styleUrl: './offline-indicator.component.css'
})
export class OfflineIndicatorComponent {
  private offlineStatusService = inject(OfflineStatusService);

  isOffline = computed(() => !this.offlineStatusService.isOnline());
}
