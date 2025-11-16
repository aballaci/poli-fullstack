import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackgroundSyncService } from '../../services/background-sync.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
    selector: 'app-sync-indicator',
    standalone: true,
    imports: [CommonModule, TranslocoModule],
    templateUrl: './sync-indicator.component.html',
    styleUrls: ['./sync-indicator.component.css']
})
export class SyncIndicatorComponent {
    private syncService = inject(BackgroundSyncService);

    isSyncing = this.syncService.isSyncing;
    pendingOperations = this.syncService.pendingOperations;
    syncError = this.syncService.syncError;

    // Show indicator when syncing or when there are pending operations
    showIndicator = computed(() => {
        return this.isSyncing() || this.pendingOperations() > 0;
    });

    // Get status message
    statusMessage = computed(() => {
        if (this.syncError()) {
            return 'sync.error';
        }
        if (this.isSyncing()) {
            return 'sync.syncing';
        }
        if (this.pendingOperations() > 0) {
            return 'sync.pending';
        }
        return '';
    });

    // Get status icon
    statusIcon = computed(() => {
        if (this.syncError()) {
            return '⚠️';
        }
        if (this.isSyncing()) {
            return '🔄';
        }
        if (this.pendingOperations() > 0) {
            return '⏳';
        }
        return '';
    });
}
