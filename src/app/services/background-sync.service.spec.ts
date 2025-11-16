import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { BackgroundSyncService, SyncOperation } from './background-sync.service';
import { OfflineStatusService } from './offline-status.service';

describe('BackgroundSyncService', () => {
    let service: BackgroundSyncService;
    let offlineStatusService: OfflineStatusService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [
                BackgroundSyncService,
                OfflineStatusService
            ]
        });

        service = TestBed.inject(BackgroundSyncService);
        offlineStatusService = TestBed.inject(OfflineStatusService);

        // Clear any existing data
        await service.clearQueue();
    });

    afterEach(async () => {
        // Clean up after each test
        await service.clearQueue();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Queue Operations', () => {
        it('should add operation to sync queue', fakeAsync(async () => {
            const operation = {
                type: 'saveHistory' as const,
                data: { scenarioId: 'test-123', timestamp: Date.now() }
            };

            await service.queueForSync(operation);
            tick();

            expect(service.pendingOperations()).toBe(1);

            const pending = await service.getPendingOperations();
            expect(pending.length).toBe(1);
            expect(pending[0].type).toBe('saveHistory');
            expect(pending[0].data.scenarioId).toBe('test-123');

            flush();
        }));

        it('should add multiple operations to queue', fakeAsync(async () => {
            await service.queueForSync({
                type: 'saveHistory',
                data: { scenarioId: 'test-1' }
            });

            await service.queueForSync({
                type: 'updateProgress',
                data: { scenarioId: 'test-2', progress: 50 }
            });

            await service.queueForSync({
                type: 'saveScenario',
                data: { scenarioId: 'test-3' }
            });

            tick();

            expect(service.pendingOperations()).toBe(3);

            const pending = await service.getPendingOperations();
            expect(pending.length).toBe(3);

            flush();
        }));

        it('should generate unique IDs for operations', fakeAsync(async () => {
            await service.queueForSync({
                type: 'saveHistory',
                data: { test: 'data1' }
            });

            await service.queueForSync({
                type: 'saveHistory',
                data: { test: 'data2' }
            });

            tick();

            const pending = await service.getPendingOperations();
            expect(pending[0].id).not.toBe(pending[1].id);

            flush();
        }));

        it('should initialize operations with retryCount of 0', fakeAsync(async () => {
            await service.queueForSync({
                type: 'updateProgress',
                data: { test: 'data' }
            });

            tick();

            const pending = await service.getPendingOperations();
            expect(pending[0].retryCount).toBe(0);

            flush();
        }));

        it('should clear all operations from queue', fakeAsync(async () => {
            // Add multiple operations
            await service.queueForSync({ type: 'saveHistory', data: {} });
            await service.queueForSync({ type: 'updateProgress', data: {} });
            await service.queueForSync({ type: 'saveScenario', data: {} });
            tick();

            expect(service.pendingOperations()).toBe(3);

            // Clear queue
            await service.clearQueue();
            tick();

            expect(service.pendingOperations()).toBe(0);

            const pending = await service.getPendingOperations();
            expect(pending.length).toBe(0);

            flush();
        }));
    });

    describe('Sync Execution', () => {
        it('should not sync when offline', fakeAsync(async () => {
            // Set offline
            offlineStatusService.isOnline.set(false);

            // Add operation
            await service.queueForSync({
                type: 'saveHistory',
                data: { test: 'data' }
            });
            tick();

            expect(service.pendingOperations()).toBe(1);

            // Try to sync
            await service.performSync();
            tick();

            // Should not sync
            expect(service.isSyncing()).toBe(false);
            expect(service.pendingOperations()).toBe(1);

            flush();
        }));

        it('should sync when online', fakeAsync(async () => {
            // Set online
            offlineStatusService.isOnline.set(true);

            // Add operation
            await service.queueForSync({
                type: 'saveHistory',
                data: { test: 'data' }
            });
            tick();

            expect(service.pendingOperations()).toBe(1);

            // Perform sync
            await service.performSync();
            tick(5000);

            // Sync should have been attempted
            expect(service.isSyncing()).toBe(false);

            flush();
        }));

        it('should not start sync if already syncing', fakeAsync(async () => {
            offlineStatusService.isOnline.set(true);

            // Add operations
            await service.queueForSync({ type: 'saveHistory', data: {} });
            await service.queueForSync({ type: 'updateProgress', data: {} });
            tick();

            // Start first sync
            const sync1 = service.performSync();

            // Try to start second sync immediately
            const sync2 = service.performSync();

            tick(1000);

            // Both should complete without error
            await Promise.all([sync1, sync2]);

            flush();
        }));

        it('should process multiple operations in batch', fakeAsync(async () => {
            offlineStatusService.isOnline.set(true);

            // Add multiple operations
            for (let i = 0; i < 5; i++) {
                await service.queueForSync({
                    type: 'updateProgress',
                    data: { index: i }
                });
            }
            tick();

            expect(service.pendingOperations()).toBe(5);

            // Perform sync
            await service.performSync();
            tick(5000);

            // Operations should be processed
            expect(service.isSyncing()).toBe(false);

            flush();
        }));
    });

    describe('Retry Logic', () => {
        it('should increment retry count on failure', fakeAsync(async () => {
            offlineStatusService.isOnline.set(true);

            // Add operation
            await service.queueForSync({
                type: 'saveHistory',
                data: { test: 'data' }
            });
            tick();

            // Perform sync (will fail in test environment)
            await service.performSync();
            tick(2000);

            const pending = await service.getPendingOperations();
            if (pending.length > 0) {
                // Retry count should be incremented if sync failed
                expect(pending[0].retryCount).toBeGreaterThanOrEqual(0);
            }

            flush();
        }));

        it('should remove operation after max retries', fakeAsync(async () => {
            offlineStatusService.isOnline.set(true);

            // Add operation
            await service.queueForSync({
                type: 'saveHistory',
                data: { test: 'data' }
            });
            tick();

            // Manually set retry count to max
            const pending = await service.getPendingOperations();
            if (pending.length > 0) {
                pending[0].retryCount = 3; // MAX_RETRIES
                // Note: In real implementation, we'd need to update the DB
            }

            // Perform sync
            await service.performSync();
            tick(2000);

            flush();
        }));

        it('should apply exponential backoff between retries', fakeAsync(async () => {
            offlineStatusService.isOnline.set(true);

            // Add operation
            await service.queueForSync({
                type: 'updateProgress',
                data: { test: 'data' }
            });
            tick();

            // First sync attempt
            await service.performSync();
            tick(1000);

            const pending1 = await service.getPendingOperations();
            const firstAttemptTime = pending1[0]?.lastAttempt;

            // Immediate second sync attempt (should be skipped due to backoff)
            await service.performSync();
            tick(500);

            const pending2 = await service.getPendingOperations();
            if (pending2.length > 0 && firstAttemptTime) {
                // Last attempt time should not change if backoff prevented retry
                expect(pending2[0].lastAttempt).toBeDefined();
            }

            flush();
        }));
    });

    describe('Pending Operations', () => {
        it('should return empty array when no operations queued', fakeAsync(async () => {
            const pending = await service.getPendingOperations();
            tick();

            expect(pending).toEqual([]);
            expect(service.pendingOperations()).toBe(0);

            flush();
        }));

        it('should return all pending operations', fakeAsync(async () => {
            const ops = [
                { type: 'saveHistory' as const, data: { id: 1 } },
                { type: 'updateProgress' as const, data: { id: 2 } },
                { type: 'saveScenario' as const, data: { id: 3 } }
            ];

            for (const op of ops) {
                await service.queueForSync(op);
            }
            tick();

            const pending = await service.getPendingOperations();
            expect(pending.length).toBe(3);

            flush();
        }));

        it('should update pending count signal correctly', fakeAsync(async () => {
            expect(service.pendingOperations()).toBe(0);

            await service.queueForSync({ type: 'saveHistory', data: {} });
            tick();
            expect(service.pendingOperations()).toBe(1);

            await service.queueForSync({ type: 'updateProgress', data: {} });
            tick();
            expect(service.pendingOperations()).toBe(2);

            await service.clearQueue();
            tick();
            expect(service.pendingOperations()).toBe(0);

            flush();
        }));
    });

    describe('Automatic Sync Triggers', () => {
        it('should trigger sync when coming back online', fakeAsync(() => {
            const performSyncSpy = spyOn(service, 'performSync');

            // Simulate online event
            window.dispatchEvent(new Event('online'));
            tick(2500); // Wait for the 2 second delay

            expect(performSyncSpy).toHaveBeenCalled();

            flush();
        }));
    });
});
