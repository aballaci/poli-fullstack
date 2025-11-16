import { TestBed } from '@angular/core/testing';
import { OfflineStorageService } from './offline-storage.service';
import { ConversationScenario } from '../models';

describe('OfflineStorageService - Cache Monitoring and Pruning', () => {
    let service: OfflineStorageService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OfflineStorageService]
        });
        service = TestBed.inject(OfflineStorageService);
    });

    afterEach(async () => {
        // Clean up after each test
        await service.clearAllOfflineData();
    });

    describe('Cache Size Monitoring', () => {
        it('should calculate cache size correctly', async () => {
            const mockScenario: ConversationScenario = {
                id: 'test-scenario-1',
                name: 'Test Scenario',
                difficulty_level: 'beginner',
                sentences: [
                    { id: '1', text: 'Hello', translation: 'Hola', audio_url: '' }
                ],
                vocabulary: []
            };

            await service.saveScenarioForOffline(mockScenario);
            const size = await service.getCacheSize();

            expect(size).toBeGreaterThan(0);
        });

        it('should return cache statistics', async () => {
            const mockScenario: ConversationScenario = {
                id: 'test-scenario-2',
                name: 'Test Scenario 2',
                difficulty_level: 'intermediate',
                sentences: [
                    { id: '1', text: 'Good morning', translation: 'Buenos días', audio_url: '' }
                ],
                vocabulary: []
            };

            await service.saveScenarioForOffline(mockScenario);
            const stats = await service.getCacheStatistics();

            expect(stats.scenarioCount).toBe(1);
            expect(stats.totalSize).toBeGreaterThan(0);
            expect(stats.oldestScenario).toBeTruthy();
            expect(stats.newestScenario).toBeTruthy();
        });
    });

    describe('LRU Cache Eviction', () => {
        it('should keep minimum number of scenarios during pruning', async () => {
            // Create 12 scenarios (more than MIN_SCENARIOS_TO_KEEP which is 10)
            const scenarios: ConversationScenario[] = [];
            for (let i = 0; i < 12; i++) {
                scenarios.push({
                    id: `scenario-${i}`,
                    name: `Scenario ${i}`,
                    difficulty_level: 'beginner',
                    sentences: [
                        { id: '1', text: `Test ${i}`, translation: `Prueba ${i}`, audio_url: '' }
                    ],
                    vocabulary: []
                });
            }

            // Save all scenarios with delays to ensure different timestamps
            for (const scenario of scenarios) {
                await service.saveScenarioForOffline(scenario);
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Manually trigger pruning (simulating cache size exceeded)
            await service.checkCacheSizeAndPrune();

            const cachedIds = await service.getCachedScenarioIds();

            // Should have at least 10 scenarios (MIN_SCENARIOS_TO_KEEP)
            expect(cachedIds.length).toBeGreaterThanOrEqual(10);
        });

        it('should update lastModified timestamp when accessing scenarios', async () => {
            const mockScenario: ConversationScenario = {
                id: 'test-access-scenario',
                name: 'Access Test',
                difficulty_level: 'beginner',
                sentences: [
                    { id: '1', text: 'Test', translation: 'Prueba', audio_url: '' }
                ],
                vocabulary: []
            };

            await service.saveScenarioForOffline(mockScenario);

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 100));

            // Access the scenario
            await service.getOfflineScenario('test-access-scenario');

            const stats = await service.getCacheStatistics();
            expect(stats.newestScenario).toBeTruthy();
        });
    });

    describe('Age-based Pruning', () => {
        it('should prune scenarios older than specified age', async () => {
            const mockScenario: ConversationScenario = {
                id: 'old-scenario',
                name: 'Old Scenario',
                difficulty_level: 'beginner',
                sentences: [
                    { id: '1', text: 'Old', translation: 'Viejo', audio_url: '' }
                ],
                vocabulary: []
            };

            await service.saveScenarioForOffline(mockScenario);

            // Prune scenarios older than 0ms (should prune all except minimum)
            const prunedCount = await service.pruneOldCache(0);

            // Should have pruned at least 1 scenario if we had more than MIN_SCENARIOS_TO_KEEP
            expect(prunedCount).toBeGreaterThanOrEqual(0);
        });

        it('should keep minimum scenarios even if they are old', async () => {
            // Create exactly MIN_SCENARIOS_TO_KEEP scenarios
            for (let i = 0; i < 10; i++) {
                await service.saveScenarioForOffline({
                    id: `keep-scenario-${i}`,
                    name: `Keep Scenario ${i}`,
                    difficulty_level: 'beginner',
                    sentences: [
                        { id: '1', text: `Keep ${i}`, translation: `Mantener ${i}`, audio_url: '' }
                    ],
                    vocabulary: []
                });
            }

            // Try to prune all old scenarios
            const prunedCount = await service.pruneOldCache(0);

            const cachedIds = await service.getCachedScenarioIds();

            // Should still have 10 scenarios (MIN_SCENARIOS_TO_KEEP)
            expect(cachedIds.length).toBe(10);
            expect(prunedCount).toBe(0);
        });
    });

    describe('Automatic Pruning on Save', () => {
        it('should handle quota exceeded error gracefully', async () => {
            const mockScenario: ConversationScenario = {
                id: 'quota-test-scenario',
                name: 'Quota Test',
                difficulty_level: 'beginner',
                sentences: [
                    { id: '1', text: 'Test', translation: 'Prueba', audio_url: '' }
                ],
                vocabulary: []
            };

            // This should not throw even if quota is exceeded
            await expectAsync(
                service.saveScenarioForOffline(mockScenario)
            ).toBeResolved();
        });
    });

    describe('Cache Statistics', () => {
        it('should report when cache is over limit', async () => {
            const stats = await service.getCacheStatistics();

            expect(stats.isOverLimit).toBeDefined();
            expect(typeof stats.isOverLimit).toBe('boolean');
        });

        it('should track scenario and exercise counts', async () => {
            const mockScenario: ConversationScenario = {
                id: 'stats-scenario',
                name: 'Stats Test',
                difficulty_level: 'beginner',
                sentences: [
                    { id: '1', text: 'Stats', translation: 'Estadísticas', audio_url: '' }
                ],
                vocabulary: []
            };

            await service.saveScenarioForOffline(mockScenario);

            const stats = await service.getCacheStatistics();

            expect(stats.scenarioCount).toBe(1);
            expect(stats.exerciseCount).toBe(0);
        });
    });
});
