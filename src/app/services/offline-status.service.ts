import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class OfflineStatusService {
    // Signal for reactive online/offline state
    isOnline = signal<boolean>(navigator.onLine);

    private checkInterval: any;
    private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds

    constructor() {
        // Listen to browser online/offline events
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));

        // Start periodic connectivity checks
        this.startPeriodicCheck();

        // Log connectivity changes
        effect(() => {
            console.log(`[OfflineStatus] Network status: ${this.isOnline() ? 'ONLINE' : 'OFFLINE'}`);
        });
    }

    private handleOnline(): void {
        console.log('[OfflineStatus] 🌐 Network connection restored');
        this.isOnline.set(true);
        this.verifyConnectivity();
    }

    private handleOffline(): void {
        console.warn('[OfflineStatus] ⚠ Network connection lost - entering offline mode');
        this.isOnline.set(false);
    }

    private startPeriodicCheck(): void {
        this.checkInterval = setInterval(() => {
            this.verifyConnectivity();
        }, this.CHECK_INTERVAL_MS);
    }

    /**
     * Verify actual connectivity with a network request
     * This helps detect cases where navigator.onLine is true but no actual connectivity exists
     */
    private async verifyConnectivity(): Promise<void> {
        if (!navigator.onLine) {
            this.isOnline.set(false);
            return;
        }

        try {
            // Try to fetch a small resource with no-cache to verify real connectivity
            const response = await fetch('/favicon.svg', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            const isConnected = response.ok;
            this.isOnline.set(isConnected);

            if (!isConnected) {
                console.warn('[OfflineStatus] ⚠ Connectivity verification failed - may be offline');
            }
        } catch (error) {
            console.warn('[OfflineStatus] ⚠ Connectivity verification failed:', error);
            this.isOnline.set(false);
        }
    }

    /**
     * Manually trigger connectivity check
     */
    async checkConnectivity(): Promise<boolean> {
        console.log('[OfflineStatus] Manual connectivity check requested');
        await this.verifyConnectivity();
        const status = this.isOnline();
        console.log(`[OfflineStatus] Connectivity check result: ${status ? 'ONLINE' : 'OFFLINE'}`);
        return status;
    }

    /**
     * Clean up resources
     */
    ngOnDestroy(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        window.removeEventListener('online', this.handleOnline.bind(this));
        window.removeEventListener('offline', this.handleOffline.bind(this));
    }
}
