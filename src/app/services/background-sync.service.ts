import { Injectable, signal, inject } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { OfflineStatusService } from './offline-status.service';

interface SyncQueueDB extends DBSchema {
    syncQueue: {
        key: string;
        value: SyncOperation;
        indexes: {
            'timestamp': number;
            'retryCount': number;
        };
    };
}

export interface SyncOperation {
    id: string;
    type: 'saveHistory' | 'updateProgress' | 'saveScenario';
    data: any;
    timestamp: number;
    retryCount: number;
    lastAttempt?: number;
}

@Injectable({
    providedIn: 'root'
})
export class BackgroundSyncService {
    private db: IDBPDatabase<SyncQueueDB> | null = null;
    private readonly DB_NAME = 'poli-sync-queue';
    private readonly DB_VERSION = 1;
    private readonly MAX_RETRIES = 3;
    private readonly BASE_RETRY_DELAY = 1000; // 1 second

    private offlineStatusService = inject(OfflineStatusService);

    isSyncing = signal<boolean>(false);
    pendingOperations = signal<number>(0);

    constructor() {
        this.initializeDatabase();
        this.setupSyncTriggers();
    }

    private async initializeDatabase(): Promise<void> {
        try {
            this.db = await openDB<SyncQueueDB>(this.DB_NAME, this.DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('syncQueue')) {
                        const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
                        store.createIndex('timestamp', 'timestamp');
                        store.createIndex('retryCount', 'retryCount');
                    }
                }
            });

            await this.updatePendingCount();
        } catch (error) {
            console.error('[BackgroundSync] Failed to initialize database:', error);
        }
    }

    private setupSyncTriggers(): void {
        // Trigger sync when coming back online
        window.addEventListener('online', () => {
            console.log('[BackgroundSync] Network restored, triggering sync');
            setTimeout(() => this.performSync(), 2000);
        });
    }

    /**
     * Add an operation to the sync queue
     */
    async queueForSync(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
        if (!this.db) {
            console.error('[BackgroundSync] Database not initialized');
            return;
        }

        try {
            const syncOp: SyncOperation = {
                ...operation,
                id: `${operation.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                retryCount: 0
            };

            await this.db.add('syncQueue', syncOp);
            await this.updatePendingCount();

            console.log('[BackgroundSync] Operation queued:', syncOp.type);

            // Try to sync immediately if online
            if (this.offlineStatusService.isOnline()) {
                this.performSync();
            }
        } catch (error) {
            console.error('[BackgroundSync] Failed to queue operation:', error);
        }
    }

    /**
     * Process all queued sync operations
     */
    async performSync(): Promise<void> {
        if (!this.db || this.isSyncing() || !this.offlineStatusService.isOnline()) {
            return;
        }

        this.isSyncing.set(true);

        try {
            const operations = await this.db.getAll('syncQueue');

            if (operations.length === 0) {
                console.log('[BackgroundSync] No operations to sync');
                return;
            }

            console.log(`[BackgroundSync] Syncing ${operations.length} operations`);

            for (const operation of operations) {
                await this.processSyncOperation(operation);
            }

            await this.updatePendingCount();
        } catch (error) {
            console.error('[BackgroundSync] Sync failed:', error);
        } finally {
            this.isSyncing.set(false);
        }
    }

    private async processSyncOperation(operation: SyncOperation): Promise<void> {
        if (!this.db) return;

        try {
            // Check if max retries exceeded
            if (operation.retryCount >= this.MAX_RETRIES) {
                console.warn(`[BackgroundSync] Max retries exceeded for operation ${operation.id}, removing from queue`);
                await this.db.delete('syncQueue', operation.id);
                return;
            }

            // Apply exponential backoff
            if (operation.lastAttempt) {
                const timeSinceLastAttempt = Date.now() - operation.lastAttempt;
                const requiredDelay = this.BASE_RETRY_DELAY * Math.pow(2, operation.retryCount);

                if (timeSinceLastAttempt < requiredDelay) {
                    console.log(`[BackgroundSync] Skipping operation ${operation.id} due to backoff`);
                    return;
                }
            }

            // Process based on operation type
            let success = false;

            switch (operation.type) {
                case 'saveHistory':
                    success = await this.syncSaveHistory(operation.data);
                    break;
                case 'updateProgress':
                    success = await this.syncUpdateProgress(operation.data);
                    break;
                case 'saveScenario':
                    success = await this.syncSaveScenario(operation.data);
                    break;
                default:
                    console.warn(`[BackgroundSync] Unknown operation type: ${operation.type}`);
                    success = true; // Remove unknown operations
            }

            if (success) {
                await this.db.delete('syncQueue', operation.id);
                console.log(`[BackgroundSync] Successfully synced operation ${operation.id}`);
            } else {
                // Update retry count and last attempt
                operation.retryCount++;
                operation.lastAttempt = Date.now();
                await this.db.put('syncQueue', operation);
                console.log(`[BackgroundSync] Retry ${operation.retryCount}/${this.MAX_RETRIES} for operation ${operation.id}`);
            }
        } catch (error) {
            console.error(`[BackgroundSync] Error processing operation ${operation.id}:`, error);

            // Update retry count
            operation.retryCount++;
            operation.lastAttempt = Date.now();
            await this.db.put('syncQueue', operation);
        }
    }

    private async syncSaveHistory(data: any): Promise<boolean> {
        try {
            // This would call the actual API to save history
            // For now, we'll just simulate success
            console.log('[BackgroundSync] Syncing save history:', data);

            // TODO: Implement actual API call when available
            // await this.geminiService.saveToHistory(data.scenario, data.category, data.topic);

            return true;
        } catch (error) {
            console.error('[BackgroundSync] Failed to sync save history:', error);
            return false;
        }
    }

    private async syncUpdateProgress(data: any): Promise<boolean> {
        try {
            console.log('[BackgroundSync] Syncing update progress:', data);

            // TODO: Implement actual API call when available

            return true;
        } catch (error) {
            console.error('[BackgroundSync] Failed to sync update progress:', error);
            return false;
        }
    }

    private async syncSaveScenario(data: any): Promise<boolean> {
        try {
            console.log('[BackgroundSync] Syncing save scenario:', data);

            // TODO: Implement actual API call when available

            return true;
        } catch (error) {
            console.error('[BackgroundSync] Failed to sync save scenario:', error);
            return false;
        }
    }

    private async updatePendingCount(): Promise<void> {
        if (!this.db) return;

        try {
            const count = await this.db.count('syncQueue');
            this.pendingOperations.set(count);
        } catch (error) {
            console.error('[BackgroundSync] Failed to update pending count:', error);
        }
    }

    /**
     * Clear all pending sync operations
     */
    async clearQueue(): Promise<void> {
        if (!this.db) return;

        try {
            await this.db.clear('syncQueue');
            await this.updatePendingCount();
            console.log('[BackgroundSync] Queue cleared');
        } catch (error) {
            console.error('[BackgroundSync] Failed to clear queue:', error);
        }
    }

    /**
     * Get all pending operations
     */
    async getPendingOperations(): Promise<SyncOperation[]> {
        if (!this.db) return [];

        try {
            return await this.db.getAll('syncQueue');
        } catch (error) {
            console.error('[BackgroundSync] Failed to get pending operations:', error);
            return [];
        }
    }
}
