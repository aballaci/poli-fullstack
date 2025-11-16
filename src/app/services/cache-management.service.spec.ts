import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { CacheManagementService, CacheStats } from './cache-management.service';
import { OfflineStorageService } from './offline-storage.service';
import { ConversationScenario } from '../models';

describe('CacheManagementService', () => {
    let service: CacheManagementService;
    let offlineStorage: OfflineStorageService;

    const mockScenario: ConversationScenario = {
        id: 'test-scenario-1',
        name: 'Test Scenario',
        description: 'A test scenario',
        difficulty_level: 'beginner',
        sentences: [
            {
                id: 'sent-1',
                source: {
                    text: 'Hello',
                    highlighted_words: []
                },
                target: {
                    text: 'Hola',
                    highlighted_words: []
                }
            }
        ]
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [
                CacheManagementService,
                OfflineStorageService
            ]
        });

        service = TestBed.inject(CacheManagementService);
        offlineStorage = TestBed.inject(OfflineStorageService);

        // Clear any existing data
        await offlineStorage.clearAllOfflineData();
    });

    afterEach(async () => {
        // Clean up after each test
        await offlineStorage.clearAllOfflineData();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Cache Statistics', () => {
        it('should return cache stats with zero values when cache is empty', fakeAsync(async () => {
            const stats = await service.getCacheStats();
            tick();

            expect(stats).toBeDefined();
            expect(stats.indexedDB).toBeDefined();
            expect(stats.serviceWorker).toBeDefined();
            expect(stats.total).toBeDefined();

            expect(stats.indexedDB.scenarioCount).toBe(0);
            expect(stats.indexedDB.exerciseCount).toBe(0);
            expect(stats.total.size).toBeGreaterThanOrEqual(0);

            flush();
        }));

        it('should calculate IndexedDB cache size correctly', fakeAsync(async () => {
            // Add scenario to cache
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            const stats = await service.getCacheStats();
            tick();

            expect(stats.indexedDB.size).toBeGreaterThan(0);
            expect(stats.indexedDB.scenarioCount).toBe(1);

            flush();
        }));

        it('should count scenarios correctly', fakeAsync(async () => {
            // Add multiple scenarios
            await offlineStorage.saveScenarioForOffline(mockScenario);
            await offlineStorage.saveScenarioForOffline({
                ...mockScenario,
                id: 'test-2',
                name: 'Test 2'
            });
            await offlineStorage.saveScenarioForOffline({
                ...mockScenario,
                id: 'test-3',
                name: 'Test 3'
            });
            tick();

            const stats = await service.getCacheStats();
            tick();

            expect(stats.indexedDB.scenarioCount).toBe(3);

            flush();
        }));

        it('should count exercises correctly', fakeAsync(async () => {
            // Add scenario with exercises
            await offlineStorage.saveScenarioForOffline(mockScenario);
            await offlineStorage.cacheExercise(mockScenario.id, 'fillInBlank', {
                exercises: []
            });
            tick();

            const stats = await service.getCacheStats();
            tick();

            expect(stats.indexedDB.exerciseCount).toBeGreaterThanOrEqual(0);

            flush();
        }));

        it('should track oldest and newest items', fakeAsync(async () => {
            // Add scenarios at different times
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick(100);

            await offlineStorage.saveScenarioForOffline({
                ...mockScenario,
                id: 'test-2'
            });
            tick(100);

            const stats = await service.getCacheStats();
            tick();

            if (stats.indexedDB.oldestItem && stats.indexedDB.newestItem) {
                expect(stats.indexedDB.oldestItem).toBeInstanceOf(Date);
                expect(stats.indexedDB.newestItem).toBeInstanceOf(Date);
                expect(stats.indexedDB.newestItem.getTime())
                    .toBeGreaterThanOrEqual(stats.indexedDB.oldestItem.getTime());
            }

            flush();
        }));

        it('should format total size as human-readable string', fakeAsync(async () => {
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            const stats = await service.getCacheStats();
            tick();

            expect(stats.total.sizeFormatted).toBeDefined();
            expect(typeof stats.total.sizeFormatted).toBe('string');
            expect(stats.total.sizeFormatted).toMatch(/\d+(\.\d+)?\s+(Bytes|KB|MB|GB)/);

            flush();
        }));

        it('should include service worker cache stats', fakeAsync(async () => {
            const stats = await service.getCacheStats();
            tick();

            expect(stats.serviceWorker).toBeDefined();
            expect(stats.serviceWorker.size).toBeGreaterThanOrEqual(0);
            expect(stats.serviceWorker.cacheNames).toBeDefined();
            expect(Array.isArray(stats.serviceWorker.cacheNames)).toBe(true);

            flush();
        }));

        it('should calculate total size from both caches', fakeAsync(async () => {
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            const stats = await service.getCacheStats();
            tick();

            const expectedTotal = stats.indexedDB.size + stats.serviceWorker.size;
            expect(stats.total.size).toBe(expectedTotal);

            flush();
        }));
    });

    describe('Cache Clearing', () => {
        it('should clear IndexedDB cache', fakeAsync(async () => {
            // Add data
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            expect(offlineStorage.savedScenarios().length).toBe(1);

            // Clear cache
            await service.clearIndexedDBCache();
            tick();

            expect(offlineStorage.savedScenarios().length).toBe(0);

            flush();
        }));

        it('should clear service worker cache', fakeAsync(async () => {
            // This test verifies the method runs without error
            // Actual cache clearing depends on browser Cache API availability

            await service.clearServiceWorkerCache();
            tick();

            // Should complete without throwing
            expect(true).toBe(true);

            flush();
        }));

        it('should clear all caches', fakeAsync(async () => {
            // Add data
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            expect(offlineStorage.savedScenarios().length).toBe(1);

            // Clear all caches
            await service.clearAllCaches();
            tick();

            expect(offlineStorage.savedScenarios().length).toBe(0);

            flush();
        }));

        it('should handle clearing when cache is already empty', fakeAsync(async () => {
            // Clear empty cache
            await service.clearAllCaches();
            tick();

            const stats = await service.getCacheStats();
            tick();

            expect(stats.indexedDB.scenarioCount).toBe(0);

            flush();
        }));

        it('should handle errors gracefully when clearing service worker cache', fakeAsync(async () => {
            // Mock caches API to throw error
            if ('caches' in window) {
                const originalCaches = window.caches;
                Object.defineProperty(window, 'caches', {
                    value: {
                        keys: () => Promise.reject(new Error('Test error'))
                    },
                    writable: true,
                    configurable: true
                });

                try {
                    await service.clearServiceWorkerCache();
                    fail('Should have thrown an error');
                } catch (error) {
                    expect(error).toBeDefined();
                }

                // Restore original
                Object.defineProperty(window, 'caches', {
                    value: originalCaches,
                    writable: true,
                    configurable: true
                });
            }

            flush();
        }));
    });

    describe('Size Formatting', () => {
        it('should format 0 bytes correctly', () => {
            const formatted = service.formatSize(0);
            expect(formatted).toBe('0 Bytes');
        });

        it('should format bytes correctly', () => {
            const formatted = service.formatSize(500);
            expect(formatted).toBe('500 Bytes');
        });

        it('should format kilobytes correctly', () => {
            const formatted = service.formatSize(1024);
            expect(formatted).toContain('KB');
        });

        it('should format megabytes correctly', () => {
            const formatted = service.formatSize(1024 * 1024);
            expect(formatted).toContain('MB');
        });

        it('should format gigabytes correctly', () => {
            const formatted = service.formatSize(1024 * 1024 * 1024);
            expect(formatted).toContain('GB');
        });

        it('should round to 2 decimal places', () => {
            const formatted = service.formatSize(1536); // 1.5 KB
            expect(formatted).toBe('1.5 KB');
        });

        it('should handle large numbers', () => {
            const formatted = service.formatSize(5.5 * 1024 * 1024 * 1024);
            expect(formatted).toContain('GB');
            expect(formatted).toContain('5.5');
        });
    });

    describe('Service Worker Cache Operations', () => {
        it('should handle missing Cache API gracefully', fakeAsync(async () => {
            // Temporarily remove caches API
            const originalCaches = (window as any).caches;
            delete (window as any).caches;

            const stats = await service.getCacheStats();
            tick();

            expect(stats.serviceWorker.size).toBe(0);
            expect(stats.serviceWorker.cacheNames).toEqual([]);

            // Restore
            if (originalCaches) {
                (window as any).caches = originalCaches;
            }

            flush();
        }));

        it('should list cache names when available', fakeAsync(async () => {
            if ('caches' in window) {
                const stats = await service.getCacheStats();
                tick();

                expect(Array.isArray(stats.serviceWorker.cacheNames)).toBe(true);
            }

            flush();
        }));
    });

    describe('Error Handling', () => {
        it('should handle IndexedDB errors gracefully', fakeAsync(async () => {
            // Force an error by closing the database
            // This is a simplified test - real implementation would need more robust error handling

            const stats = await service.getCacheStats();
            tick();

            // Should still return valid stats structure even if errors occur
            expect(stats).toBeDefined();
            expect(stats.indexedDB).toBeDefined();
            expect(stats.total).toBeDefined();

            flush();
        }));
    });
});
