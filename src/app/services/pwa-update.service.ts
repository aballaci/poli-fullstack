import { Injectable, signal, inject, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, interval, concat } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PwaUpdateService {
    private swUpdate = inject(SwUpdate);
    private appRef = inject(ApplicationRef);

    updateAvailable = signal<boolean>(false);
    updateCheckInProgress = signal<boolean>(false);

    constructor() {
        if (this.swUpdate.isEnabled) {
            console.log('[PwaUpdate] Service worker updates enabled');
            this.setupUpdateChecks();
            this.listenForUpdates();
        } else {
            console.log('[PwaUpdate] Service worker updates disabled (likely in dev mode)');
        }
    }

    private setupUpdateChecks(): void {
        console.log('[PwaUpdate] Setting up automatic update checks (every 6 hours)');

        // Check for updates when app becomes stable
        const appIsStable$ = this.appRef.isStable.pipe(
            first(isStable => isStable === true)
        );

        // Check for updates every 6 hours
        const everySixHours$ = interval(6 * 60 * 60 * 1000);

        // Combine: check once when stable, then every 6 hours
        const checkInterval$ = concat(appIsStable$, everySixHours$);

        checkInterval$.subscribe(() => {
            console.log('[PwaUpdate] Automatic update check triggered');
            this.checkForUpdate();
        });
    }

    private listenForUpdates(): void {
        console.log('[PwaUpdate] Listening for service worker version updates');

        this.swUpdate.versionUpdates.subscribe(evt => {
            switch (evt.type) {
                case 'VERSION_DETECTED':
                    console.log('[PwaUpdate] New version detected, downloading...');
                    break;
                case 'VERSION_READY':
                    console.log('[PwaUpdate] New version ready:', evt.latestVersion);
                    console.log('[PwaUpdate] Current version:', evt.currentVersion);
                    this.updateAvailable.set(true);
                    break;
                case 'VERSION_INSTALLATION_FAILED':
                    console.error('[PwaUpdate] Version installation failed:', evt.error);
                    break;
                case 'NO_NEW_VERSION_DETECTED':
                    console.log('[PwaUpdate] No new version detected');
                    break;
            }
        });

        // Listen for unrecoverable state
        this.swUpdate.unrecoverable.subscribe(event => {
            console.error('[PwaUpdate] Unrecoverable state detected:', event.reason);
            console.error('[PwaUpdate] User intervention required - prompting for reload');
            // Notify user to reload
            if (confirm('An error occurred that requires reloading the application. Reload now?')) {
                console.log('[PwaUpdate] User accepted reload');
                window.location.reload();
            } else {
                console.warn('[PwaUpdate] User declined reload - app may not function correctly');
            }
        });
    }

    /**
     * Manually check for updates
     */
    async checkForUpdate(): Promise<boolean> {
        if (!this.swUpdate.isEnabled) {
            console.log('[PwaUpdate] Service worker not enabled - skipping update check');
            return false;
        }

        console.log('[PwaUpdate] Checking for updates...');
        this.updateCheckInProgress.set(true);

        try {
            const updateFound = await this.swUpdate.checkForUpdate();
            if (updateFound) {
                console.log('[PwaUpdate] ✓ Update available - will be downloaded in background');
            } else {
                console.log('[PwaUpdate] ✓ No update available - app is up to date');
            }
            return updateFound;
        } catch (error) {
            console.error('[PwaUpdate] ✗ Failed to check for updates:', error);
            return false;
        } finally {
            this.updateCheckInProgress.set(false);
        }
    }

    /**
     * Activate pending update and reload
     */
    async activateUpdate(): Promise<void> {
        if (!this.swUpdate.isEnabled) {
            console.log('[PwaUpdate] Service worker not enabled - cannot activate update');
            return;
        }

        try {
            console.log('[PwaUpdate] Activating pending update...');
            await this.swUpdate.activateUpdate();
            console.log('[PwaUpdate] ✓ Update activated successfully - reloading application');

            // Reload the page to load the new version
            window.location.reload();
        } catch (error) {
            console.error('[PwaUpdate] ✗ Failed to activate update:', error);
            throw error;
        }
    }

    /**
     * Dismiss the update notification
     */
    dismissUpdate(): void {
        console.log('[PwaUpdate] Update notification dismissed by user');
        this.updateAvailable.set(false);
    }
}
