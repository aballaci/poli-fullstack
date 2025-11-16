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
            this.setupUpdateChecks();
            this.listenForUpdates();
        }
    }

    private setupUpdateChecks(): void {
        // Check for updates when app becomes stable
        const appIsStable$ = this.appRef.isStable.pipe(
            first(isStable => isStable === true)
        );

        // Check for updates every 6 hours
        const everySixHours$ = interval(6 * 60 * 60 * 1000);

        // Combine: check once when stable, then every 6 hours
        const checkInterval$ = concat(appIsStable$, everySixHours$);

        checkInterval$.subscribe(() => {
            this.checkForUpdate();
        });
    }

    private listenForUpdates(): void {
        this.swUpdate.versionUpdates
            .pipe(
                filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
            )
            .subscribe(evt => {
                console.log('[PwaUpdate] New version available:', evt.latestVersion);
                this.updateAvailable.set(true);
            });

        // Listen for unrecoverable state
        this.swUpdate.unrecoverable.subscribe(event => {
            console.error('[PwaUpdate] Unrecoverable state:', event.reason);
            // Notify user to reload
            if (confirm('An error occurred that requires reloading the application. Reload now?')) {
                window.location.reload();
            }
        });
    }

    /**
     * Manually check for updates
     */
    async checkForUpdate(): Promise<boolean> {
        if (!this.swUpdate.isEnabled) {
            console.log('[PwaUpdate] Service worker not enabled');
            return false;
        }

        this.updateCheckInProgress.set(true);

        try {
            const updateFound = await this.swUpdate.checkForUpdate();
            console.log('[PwaUpdate] Update check completed:', updateFound ? 'Update available' : 'No update');
            return updateFound;
        } catch (error) {
            console.error('[PwaUpdate] Failed to check for updates:', error);
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
            console.log('[PwaUpdate] Service worker not enabled');
            return;
        }

        try {
            console.log('[PwaUpdate] Activating update...');
            await this.swUpdate.activateUpdate();

            // Reload the page to load the new version
            window.location.reload();
        } catch (error) {
            console.error('[PwaUpdate] Failed to activate update:', error);
            throw error;
        }
    }

    /**
     * Dismiss the update notification
     */
    dismissUpdate(): void {
        this.updateAvailable.set(false);
    }
}
