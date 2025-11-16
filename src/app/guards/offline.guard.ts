import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OfflineStorageService } from '../services/offline-storage.service';

export const offlineGuard: CanActivateFn = async (route, state) => {
    const offlineService = inject(OfflineStorageService);
    const router = inject(Router);

    const isOffline = offlineService.isOffline();

    if (isOffline) {
        // Extract scenario ID from route if present
        const scenarioId = route.queryParams['scenarioId'] || route.params['id'];

        if (scenarioId) {
            // Check if scenario is available offline
            const isAvailable = await offlineService.isScenarioSavedOffline(scenarioId);

            if (!isAvailable) {
                // Redirect to catalog with offline filter
                return router.parseUrl('/selector?offline=true');
            }
        }
    }

    return true;
};
