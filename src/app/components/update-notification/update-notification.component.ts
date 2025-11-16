import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaUpdateService } from '../../services/pwa-update.service';

@Component({
  selector: 'app-update-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './update-notification.component.html',
  styleUrl: './update-notification.component.css'
})
export class UpdateNotificationComponent {
  pwaUpdateService = inject(PwaUpdateService);

  updateNow(): void {
    this.pwaUpdateService.activateUpdate();
  }

  dismiss(): void {
    this.pwaUpdateService.dismissUpdate();
  }
}
