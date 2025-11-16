import { Injectable, inject } from '@angular/core';
import { OfflineStorageService } from './offline-storage.service';

export interface CacheStats {
    indexedDB: {
        size: number;
        scenarioCount: number;
        exerciseCount: number;
        oldestItem?: Date;
        newestItem?: Date;
    };
    serviceWorker: {
        size: number;
        cacheNames: string[];
    };
    total: {
        size: number;
        sizeFormatted: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class CacheManagementService {
    private offlineStorage = inject(OfflineStorageService);

    /**
     * Get comprehensive cache statistics
     */
    async getCacheStats(): Promise<CacheStats> {
        const [indexedDBStats, swStats] = await Promise.all([
            this.getIndexedDBStats(),
            this.getServiceWorkerCacheStats()
        ]);

        const totalSize = indexedDBStats.size + swStats.size;

        return {
            indexedDB: indexedDBStats,
            serviceWorker: swStats,
            total: {
                size: totalSize,
                sizeFormatted: this.formatBytes(totalSize)
            }
        };
    }

    private async getIndexedDBStats() {
        const usage = await this.offlineStorage.calculateStorageUsage();
        const scenarios = this.offlineStorage.savedScenarios();

        let oldestItem: Date | undefined;
        let newestItem: Date | undefined;

        if (scenarios.length > 0) {
            const dates = scenarios.map(s => new Date(s.savedAt));
            oldestItem = new Date(Math.min(...dates.map(d => d.getTime())));
            newestItem = new Date(Math.max(...dates.map(d => d.getTime())));
        }

        return {
            size: usage.used,
            scenarioCount: scenarios.length,
            exerciseCount: scenarios.filter(s => s.hasExercises).length,
            oldestItem,
            newestItem
        };
    }

    private async getServiceWorkerCacheStats() {
        if (!('caches' in window)) {
            return { size: 0, cacheNames: [] };
        }

        try {
            const cacheNames = await caches.keys();
            let totalSize = 0;

            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const requests = await cache.keys();

                for (const request of requests) {
                    const response = await cache.match(request);
                    if (response) {
                        const blob = await response.blob();
                        totalSize += blob.size;
                    }
                }
            }

            return {
                size: totalSize,
                cacheNames
            };
        } catch (error) {
            console.error('[CacheManagement] Error getting service worker cache stats:', error);
            return { size: 0, cacheNames: [] };
        }
    }

    /**
     * Clear all caches (both IndexedDB and Service Worker)
     */
    async clearAllCaches(): Promise<void> {
        await Promise.all([
            this.clearIndexedDBCache(),
            this.clearServiceWorkerCache()
        ]);
        console.log('[CacheManagement] All caches cleared');
    }

    /**
     * Clear only Service Worker cache
     */
    async clearServiceWorkerCache(): Promise<void> {
        if (!('caches' in window)) {
            console.log('[CacheManagement] Cache API not available');
            return;
        }

        try {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('[CacheManagement] Service Worker cache cleared');
        } catch (error) {
            console.error('[CacheManagement] Error clearing service worker cache:', error);
            throw error;
        }
    }

    /**
     * Clear only IndexedDB cache
     */
    async clearIndexedDBCache(): Promise<void> {
        try {
            await this.offlineStorage.clearCache();
            console.log('[CacheManagement] IndexedDB cache cleared');
        } catch (error) {
            console.error('[CacheManagement] Error clearing IndexedDB cache:', error);
            throw error;
        }
    }

    /**
     * Format bytes to human-readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Get formatted size for a specific number of bytes
     */
    formatSize(bytes: number): string {
        return this.formatBytes(bytes);
    }
}
