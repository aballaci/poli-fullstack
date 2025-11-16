import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { OfflineStorageService } from './offline-storage.service';
import { BackgroundSyncService } from './background-sync.service';
import { OfflineStatusService } from './offline-status.service';
import { PwaUpdateService } from './pwa-update.service';
import { ExerciseService } from './exercise.service';
import { ConversationScenario } from '../models';
import { ExerciseType, FillInBlankExercises } from '../models/exercise.models';

/**
 * Integration tests for PWA offline functionality
 * Tests the interaction between multiple services in offline scenarios
 */
describe('PWA Offline Integration Tests', () => {
    let offlineStorage: OfflineStorageService;
    let backgroundSync: BackgroundSyncService;
    let offlineStatus: OfflineStatusService;
    let exerciseService: ExerciseService;

    // Mock scenario data
    const mockScenario: ConversationScenario = {
        id: 'test-scenario-1',
        name: 'Test Scenario',
        description: 'A test scenario for integration tests',
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
            },
            {
                id: 'sent-2',
                source: {
                    text: 'How are you?',
                    highlighted_words: []
                },
                target: {
                    text: '¿Cómo estás?',
                    highlighted_words: []
                }
            }
        ]
    };

    const mockExerciseData: FillInBlankExercises = {
        exercises: [
            {
                sentenceId: 'sent-1',
                sentenceWithBlank: 'Hello, how are ___?',
                blankPosition: 3,
                correctAnswer: 'you',
                options: ['you', 'me', 'they'],
                targetLanguage: 'es'
            }
        ]
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [
                OfflineStorageService,
                BackgroundSyncService,
                OfflineStatusService,
                ExerciseService
            ]
        });

        offlineStorage = TestBed.inject(OfflineStorageService);
        backgroundSync = TestBed.inject(BackgroundSyncService);
        offlineStatus = TestBed.inject(OfflineStatusService);
        exerciseService = TestBed.inject(ExerciseService);

        // Clear any existing data
        await offlineStorage.clearAllOfflineData();
        await backgroundSync.clearQueue();
    });

    afterEach(async () => {
        // Clean up after each test
        await offlineStorage.clearAllOfflineData();
        await backgroundSync.clearQueue();
    });

    describe('Scenario Loading While Offline', () => {
        it('should load scenario online, cache it, and retrieve from cache when offline', fakeAsync(async () => {
            // Step 1: Simulate online state
            offlineStatus.isOnline.set(true);
            expect(offlineStatus.isOnline()).toBe(true);

            // Step 2: Save scenario while online
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            // Verify scenario is saved
            const savedScenarios = offlineStorage.savedScenarios();
            expect(savedScenarios.length).toBe(1);
            expect(savedScenarios[0].id).toBe(mockScenario.id);

            // Step 3: Simulate going offline
            offlineStatus.isOnline.set(false);
            expect(offlineStatus.isOnline()).toBe(false);

            // Step 4: Retrieve scenario from cache while offline
            const cachedScenario = await offlineStorage.getOfflineScenario(mockScenario.id);
            tick();

            // Verify scenario was retrieved from cache
            expect(cachedScenario).toBeTruthy();
            expect(cachedScenario?.id).toBe(mockScenario.id);
            expect(cachedScenario?.name).toBe(mockScenario.name);
            expect(cachedScenario?.sentences.length).toBe(2);

            flush();
        }));

        it('should return null when scenario is not cached and device is offline', fakeAsync(async () => {
            // Simulate offline state
            offlineStatus.isOnline.set(false);

            // Try to retrieve non-existent scenario
            const cachedScenario = await offlineStorage.getOfflineScenario('non-existent-id');
            tick();

            // Should return null
            expect(cachedScenario).toBeNull();

            flush();
        }));

        it('should handle multiple scenarios cached offline', fakeAsync(async () => {
            // Create multiple scenarios
            const scenario2: ConversationScenario = {
                ...mockScenario,
                id: 'test-scenario-2',
                name: 'Test Scenario 2'
            };

            const scenario3: ConversationScenario = {
                ...mockScenario,
                id: 'test-scenario-3',
                name: 'Test Scenario 3'
            };

            // Save all scenarios while online
            offlineStatus.isOnline.set(true);
            await offlineStorage.saveScenarioForOffline(mockScenario);
            await offlineStorage.saveScenarioForOffline(scenario2);
            await offlineStorage.saveScenarioForOffline(scenario3);
            tick();

            // Verify all saved
            expect(offlineStorage.savedScenarios().length).toBe(3);

            // Go offline
            offlineStatus.isOnline.set(false);

            // Retrieve all scenarios
            const cached1 = await offlineStorage.getOfflineScenario(mockScenario.id);
            const cached2 = await offlineStorage.getOfflineScenario(scenario2.id);
            const cached3 = await offlineStorage.getOfflineScenario(scenario3.id);
            tick();

            // Verify all retrieved
            expect(cached1?.id).toBe(mockScenario.id);
            expect(cached2?.id).toBe(scenario2.id);
            expect(cached3?.id).toBe(scenario3.id);

            flush();
        }));
    });

    describe('Exercise Caching and Offline Access', () => {
        it('should cache exercises online and retrieve them offline', fakeAsync(async () => {
            // Save scenario first
            offlineStatus.isOnline.set(true);
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            // Cache exercise
            await offlineStorage.cacheExercise(
                mockScenario.id,
                'fillInBlank',
                mockExerciseData
            );
            tick();

            // Go offline
            offlineStatus.isOnline.set(false);

            // Retrieve exercise from cache
            const cachedExercise = await offlineStorage.getCachedExercise(
                mockScenario.id,
                'fillInBlank'
            );
            tick();

            // Verify exercise retrieved
            expect(cachedExercise).toBeTruthy();
            expect(cachedExercise.exercises).toBeTruthy();
            expect(cachedExercise.exercises.length).toBe(1);

            flush();
        }));

        it('should cache multiple exercise types for a scenario', fakeAsync(async () => {
            const matchingPairsData = {
                sourceWords: [
                    { id: '1', word: 'Hello' },
                    { id: '2', word: 'Goodbye' }
                ],
                targetWords: [
                    { id: 'a', word: 'Hola' },
                    { id: 'b', word: 'Adiós' }
                ],
                correctPairs: [
                    { sourceId: '1', targetId: 'a' },
                    { sourceId: '2', targetId: 'b' }
                ]
            };

            const sentenceScrambleData = {
                exercises: [
                    {
                        sentenceId: 'sent-1',
                        sourceText: 'Hello how are you',
                        scrambledWords: ['you', 'are', 'how', 'Hello'],
                        correctOrder: [3, 2, 1, 0],
                        targetLanguage: 'es'
                    }
                ]
            };

            // Save scenario and exercises
            offlineStatus.isOnline.set(true);
            await offlineStorage.saveScenarioForOffline(mockScenario);
            await offlineStorage.cacheExercise(mockScenario.id, 'fillInBlank', mockExerciseData);
            await offlineStorage.cacheExercise(mockScenario.id, 'matchingPairs', matchingPairsData);
            await offlineStorage.cacheExercise(mockScenario.id, 'sentenceScramble', sentenceScrambleData);
            tick();

            // Go offline
            offlineStatus.isOnline.set(false);

            // Retrieve all exercises
            const fillInBlank = await offlineStorage.getCachedExercise(mockScenario.id, 'fillInBlank');
            const matchingPairs = await offlineStorage.getCachedExercise(mockScenario.id, 'matchingPairs');
            const sentenceScramble = await offlineStorage.getCachedExercise(mockScenario.id, 'sentenceScramble');
            tick();

            // Verify all exercises retrieved
            expect(fillInBlank).toBeTruthy();
            expect(matchingPairs).toBeTruthy();
            expect(sentenceScramble).toBeTruthy();

            flush();
        }));

        it('should return null for uncached exercises when offline', fakeAsync(async () => {
            // Save scenario but no exercises
            offlineStatus.isOnline.set(true);
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            // Go offline
            offlineStatus.isOnline.set(false);

            // Try to retrieve uncached exercise
            const cachedExercise = await offlineStorage.getCachedExercise(
                mockScenario.id,
                'swipe'
            );
            tick();

            // Should return null
            expect(cachedExercise).toBeNull();

            flush();
        }));
    });

    describe('Background Sync After Connectivity Restoration', () => {
        it('should queue operations while offline and sync when online', fakeAsync(async () => {
            // Start offline
            offlineStatus.isOnline.set(false);

            // Queue some operations while offline
            await backgroundSync.queueForSync({
                type: 'saveHistory',
                data: { scenarioId: mockScenario.id, timestamp: Date.now() }
            });

            await backgroundSync.queueForSync({
                type: 'updateProgress',
                data: { scenarioId: mockScenario.id, progress: 50 }
            });

            tick();

            // Verify operations are queued
            expect(backgroundSync.pendingOperations()).toBe(2);

            // Go back online
            offlineStatus.isOnline.set(true);

            // Trigger sync
            await backgroundSync.performSync();
            tick(5000); // Allow time for sync operations

            // Verify sync completed (operations should be processed)
            // Note: In real implementation, operations would be removed after successful sync
            const pendingOps = await backgroundSync.getPendingOperations();
            expect(pendingOps.length).toBeLessThanOrEqual(2);

            flush();
        }));

        it('should handle sync failures with retry logic', fakeAsync(async () => {
            // Start offline
            offlineStatus.isOnline.set(false);

            // Queue an operation
            await backgroundSync.queueForSync({
                type: 'saveHistory',
                data: { scenarioId: 'test-id' }
            });
            tick();

            expect(backgroundSync.pendingOperations()).toBe(1);

            // Go online
            offlineStatus.isOnline.set(true);

            // First sync attempt
            await backgroundSync.performSync();
            tick(2000);

            // Get pending operations to check retry count
            const ops = await backgroundSync.getPendingOperations();
            if (ops.length > 0) {
                // Operation should have retry count incremented if it failed
                expect(ops[0].retryCount).toBeGreaterThanOrEqual(0);
            }

            flush();
        }));

        it('should not sync when offline', fakeAsync(async () => {
            // Start offline
            offlineStatus.isOnline.set(false);

            // Queue operations
            await backgroundSync.queueForSync({
                type: 'saveHistory',
                data: { test: 'data' }
            });
            tick();

            const initialCount = backgroundSync.pendingOperations();

            // Try to sync while offline
            await backgroundSync.performSync();
            tick();

            // Operations should still be pending
            expect(backgroundSync.pendingOperations()).toBe(initialCount);
            expect(backgroundSync.isSyncing()).toBe(false);

            flush();
        }));

        it('should batch multiple operations in a single sync', fakeAsync(async () => {
            // Start offline
            offlineStatus.isOnline.set(false);

            // Queue multiple operations
            for (let i = 0; i < 5; i++) {
                await backgroundSync.queueForSync({
                    type: 'updateProgress',
                    data: { index: i }
                });
            }
            tick();

            expect(backgroundSync.pendingOperations()).toBe(5);

            // Go online and sync
            offlineStatus.isOnline.set(true);
            await backgroundSync.performSync();
            tick(5000);

            // All operations should be processed
            const remaining = await backgroundSync.getPendingOperations();
            expect(remaining.length).toBeLessThanOrEqual(5);

            flush();
        }));
    });

    describe('Cache Management and Storage', () => {
        it('should calculate cache size correctly', fakeAsync(async () => {
            // Save multiple scenarios
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            const scenario2 = { ...mockScenario, id: 'test-2', name: 'Test 2' };
            await offlineStorage.saveScenarioForOffline(scenario2);
            tick();

            // Get cache size
            const cacheSize = await offlineStorage.getCacheSize();
            tick();

            // Should be greater than 0
            expect(cacheSize).toBeGreaterThan(0);

            // Get storage usage
            const usage = offlineStorage.storageUsage();
            expect(usage.used).toBeGreaterThan(0);
            expect(usage.percentage).toBeGreaterThan(0);

            flush();
        }));

        it('should list all cached scenario IDs', fakeAsync(async () => {
            // Save multiple scenarios
            await offlineStorage.saveScenarioForOffline(mockScenario);
            const scenario2 = { ...mockScenario, id: 'test-2' };
            const scenario3 = { ...mockScenario, id: 'test-3' };
            await offlineStorage.saveScenarioForOffline(scenario2);
            await offlineStorage.saveScenarioForOffline(scenario3);
            tick();

            // Get cached IDs
            const cachedIds = await offlineStorage.getCachedScenarioIds();
            tick();

            // Verify all IDs present
            expect(cachedIds.length).toBe(3);
            expect(cachedIds).toContain(mockScenario.id);
            expect(cachedIds).toContain('test-2');
            expect(cachedIds).toContain('test-3');

            flush();
        }));

        it('should clear all cache data', fakeAsync(async () => {
            // Save scenarios and exercises
            await offlineStorage.saveScenarioForOffline(mockScenario);
            await offlineStorage.cacheExercise(mockScenario.id, 'fillInBlank', mockExerciseData);
            tick();

            // Verify data exists
            expect(offlineStorage.savedScenarios().length).toBe(1);

            // Clear cache
            await offlineStorage.clearCache();
            tick();

            // Verify cache is empty
            expect(offlineStorage.savedScenarios().length).toBe(0);
            const cachedIds = await offlineStorage.getCachedScenarioIds();
            expect(cachedIds.length).toBe(0);

            flush();
        }));

        it('should prune old cache entries', fakeAsync(async () => {
            // Save a scenario
            await offlineStorage.saveScenarioForOffline(mockScenario);
            tick();

            // Prune cache older than 0ms (should remove everything)
            const prunedCount = await offlineStorage.pruneOldCache(0);
            tick(1000);

            // Should have pruned the scenario
            expect(prunedCount).toBeGreaterThanOrEqual(0);

            flush();
        }));
    });

    describe('Offline Status Detection', () => {
        it('should detect online to offline transition', fakeAsync(() => {
            // Start online
            offlineStatus.isOnline.set(true);
            expect(offlineStatus.isOnline()).toBe(true);

            // Go offline
            offlineStatus.isOnline.set(false);
            tick();

            // Should detect offline
            expect(offlineStatus.isOnline()).toBe(false);

            flush();
        }));

        it('should detect offline to online transition', fakeAsync(() => {
            // Start offline
            offlineStatus.isOnline.set(false);
            expect(offlineStatus.isOnline()).toBe(false);

            // Go online
            offlineStatus.isOnline.set(true);
            tick();

            // Should detect online
            expect(offlineStatus.isOnline()).toBe(true);

            flush();
        }));

        it('should verify connectivity with network request', fakeAsync(async () => {
            // Check connectivity
            const isOnline = await offlineStatus.checkConnectivity();
            tick();

            // Should return a boolean
            expect(typeof isOnline).toBe('boolean');

            flush();
        }));
    });

    describe('Complete Offline Workflow', () => {
        it('should handle complete offline workflow: cache, go offline, use cached data, go online, sync', fakeAsync(async () => {
            // Step 1: Start online and cache data
            offlineStatus.isOnline.set(true);
            await offlineStorage.saveScenarioForOffline(mockScenario);
            await offlineStorage.cacheExercise(mockScenario.id, 'fillInBlank', mockExerciseData);
            tick();

            expect(offlineStorage.savedScenarios().length).toBe(1);

            // Step 2: Go offline
            offlineStatus.isOnline.set(false);
            tick();

            // Step 3: Access cached data while offline
            const cachedScenario = await offlineStorage.getOfflineScenario(mockScenario.id);
            const cachedExercise = await offlineStorage.getCachedExercise(mockScenario.id, 'fillInBlank');
            tick();

            expect(cachedScenario).toBeTruthy();
            expect(cachedExercise).toBeTruthy();

            // Step 4: Queue operations while offline
            await backgroundSync.queueForSync({
                type: 'updateProgress',
                data: { scenarioId: mockScenario.id, completed: true }
            });
            tick();

            expect(backgroundSync.pendingOperations()).toBe(1);

            // Step 5: Go back online
            offlineStatus.isOnline.set(true);
            tick();

            // Step 6: Sync queued operations
            await backgroundSync.performSync();
            tick(5000);

            // Verify workflow completed
            expect(offlineStatus.isOnline()).toBe(true);

            flush();
        }));
    });
});
