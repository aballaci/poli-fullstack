import { Injectable, signal, computed, effect } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ConversationScenario } from '../models';
import { ExerciseType } from '../models/exercise.models';

// Database schema interface
interface PoliOfflineDB extends DBSchema {
    scenarios: {
        key: string;
        value: OfflineScenarioData;
        indexes: {
            'difficulty': string;
            'savedAt': string;
            'lastModified': string;
        };
    };
    exercises: {
        key: [string, ExerciseType];
        value: ExerciseEntry;
        indexes: {
            'scenarioId': string;
        };
    };
    sessionState: {
        key: string;
        value: SessionState;
    };
}

// Data models
export interface OfflineScenarioMetadata {
    id: string;
    name: string;
    difficulty_level: string;
    savedAt: string;
    lastModified: string;
    size: number;
    hasExercises: boolean;
}

export interface StorageUsage {
    used: number;
    available: number;
    percentage: number;
}

export interface SessionState {
    key?: string;
    activeScenarioId: string | null;
    conversationHistory: any[];
    currentSentenceIndex: number;
    currentRoute: string;
    exerciseProgress: {
        [exerciseType: string]: {
            completed: boolean;
            currentIndex: number;
        };
    };
    timestamp: string;
}

export interface SyncResult {
    updated: string[];
    failed: string[];
    removed: string[];
}

interface OfflineScenarioData extends ConversationScenario {
    savedAt: string;
    lastModified: string;
    exercises: {
        [key in ExerciseType]?: any;
    };
}

interface ExerciseEntry {
    scenarioId: string;
    exerciseType: ExerciseType;
    data: any;
}

@Injectable({
    providedIn: 'root'
})
export class OfflineStorageService {
    private db: IDBPDatabase<PoliOfflineDB> | null = null;
    private readonly DB_NAME = 'poli-offline-db';
    private readonly DB_VERSION = 1;

    // Cache size limits
    private readonly MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
    private readonly MIN_SCENARIOS_TO_KEEP = 10;
    private readonly CACHE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    // Signals for reactive state
    private isOfflineSignal = signal<boolean>(!navigator.onLine);
    private savedScenariosSignal = signal<OfflineScenarioMetadata[]>([]);
    private storageUsageSignal = signal<StorageUsage>({ used: 0, available: 0, percentage: 0 });
    private isSyncingSignal = signal<boolean>(false);

    // Public readonly signals
    readonly isOffline = this.isOfflineSignal.asReadonly();
    readonly savedScenarios = this.savedScenariosSignal.asReadonly();
    readonly storageUsage = this.storageUsageSignal.asReadonly();
    readonly isSyncing = this.isSyncingSignal.asReadonly();

    // In-memory cache for performance
    private scenarioCache = new Map<string, OfflineScenarioData>();
    private readonly MAX_CACHE_SIZE = 10;

    // Debounce timer for session state saves
    private sessionStateSaveTimer: any = null;

    // Cache monitoring timer
    private cacheMonitoringTimer: any = null;

    constructor() {
        this.initializeDatabase();
        this.setupNetworkListeners();
        this.loadSavedScenarios();
        this.startCacheMonitoring();
    }

    // Database initialization
    private async initializeDatabase(): Promise<void> {
        try {
            this.db = await openDB<PoliOfflineDB>(this.DB_NAME, this.DB_VERSION, {
                upgrade(db) {
                    // Create scenarios store
                    if (!db.objectStoreNames.contains('scenarios')) {
                        const scenarioStore = db.createObjectStore('scenarios', { keyPath: 'id' });
                        scenarioStore.createIndex('difficulty', 'difficulty_level');
                        scenarioStore.createIndex('savedAt', 'savedAt');
                        scenarioStore.createIndex('lastModified', 'lastModified');
                    }

                    // Create exercises store
                    if (!db.objectStoreNames.contains('exercises')) {
                        const exerciseStore = db.createObjectStore('exercises', { keyPath: ['scenarioId', 'exerciseType'] });
                        exerciseStore.createIndex('scenarioId', 'scenarioId');
                    }

                    // Create session state store
                    if (!db.objectStoreNames.contains('sessionState')) {
                        db.createObjectStore('sessionState', { keyPath: 'key' });
                    }
                }
            });

            await this.calculateStorageUsage();
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
        }
    }

    // Network detection
    private setupNetworkListeners(): void {
        window.addEventListener('online', () => {
            this.isOfflineSignal.set(false);
            // Trigger sync after short delay
            setTimeout(() => this.syncOfflineScenarios(), 2000);
        });

        window.addEventListener('offline', () => {
            this.isOfflineSignal.set(true);
            // Save current session state immediately
            this.saveCurrentSessionState();
        });

        // Periodic connectivity check
        setInterval(() => this.checkConnectivity(), 30000);
    }

    private async checkConnectivity(): Promise<void> {
        try {
            const response = await fetch('/assets/i18n/en.json', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            this.isOfflineSignal.set(!response.ok);
        } catch {
            this.isOfflineSignal.set(true);
        }
    }

    // Cache monitoring
    private startCacheMonitoring(): void {
        // Initial check after a short delay
        setTimeout(() => this.checkAndPruneCache(), 10000);

        // Periodic monitoring
        this.cacheMonitoringTimer = setInterval(() => {
            this.checkAndPruneCache();
        }, this.CACHE_CHECK_INTERVAL_MS);
    }

    private async checkAndPruneCache(): Promise<void> {
        try {
            const usage = await this.calculateStorageUsage();

            console.log(`[OfflineStorage] Cache monitoring: ${(usage.used / (1024 * 1024)).toFixed(2)}MB used (${usage.percentage.toFixed(1)}%)`);

            // Check if cache exceeds limit
            if (usage.used > this.MAX_CACHE_SIZE_BYTES) {
                console.warn(`[OfflineStorage] Cache size (${(usage.used / (1024 * 1024)).toFixed(2)}MB) exceeds limit (${this.MAX_CACHE_SIZE_BYTES / (1024 * 1024)}MB). Starting automatic pruning...`);
                await this.performAutomaticPruning();
            }
        } catch (error) {
            console.error('[OfflineStorage] Error during cache monitoring:', error);
        }
    }

    private async performAutomaticPruning(): Promise<void> {
        if (!this.db) return;

        try {
            const scenarios = await this.db.getAll('scenarios');

            // Sort by lastModified (oldest first) - LRU strategy
            const sortedScenarios = scenarios
                .map(s => ({
                    ...s,
                    lastModifiedTime: new Date(s.lastModified).getTime(),
                    size: new Blob([JSON.stringify(s)]).size
                }))
                .sort((a, b) => a.lastModifiedTime - b.lastModifiedTime);

            // Keep at least MIN_SCENARIOS_TO_KEEP most recent scenarios
            const scenariosToKeep = sortedScenarios.slice(-this.MIN_SCENARIOS_TO_KEEP);
            const scenariosToConsiderForPruning = sortedScenarios.slice(0, -this.MIN_SCENARIOS_TO_KEEP);

            let currentSize = await this.getCacheSize();
            let prunedCount = 0;

            console.log(`[OfflineStorage] Pruning: ${scenariosToConsiderForPruning.length} scenarios eligible for removal, ${scenariosToKeep.length} will be kept`);

            // Remove oldest scenarios until we're under the limit
            for (const scenario of scenariosToConsiderForPruning) {
                if (currentSize <= this.MAX_CACHE_SIZE_BYTES) {
                    break;
                }

                console.log(`[OfflineStorage] Pruning scenario: ${scenario.id} (${scenario.name}) - Last modified: ${new Date(scenario.lastModified).toLocaleDateString()}, Size: ${(scenario.size / 1024).toFixed(2)}KB`);

                await this.removeScenarioFromOffline(scenario.id);
                currentSize -= scenario.size;
                prunedCount++;
            }

            if (prunedCount > 0) {
                console.log(`[OfflineStorage] ✓ Automatic pruning complete: ${prunedCount} scenario(s) removed, cache size now: ${(currentSize / (1024 * 1024)).toFixed(2)}MB`);
                await this.loadSavedScenarios();
                await this.calculateStorageUsage();
            } else {
                console.log('[OfflineStorage] No scenarios pruned - all scenarios are within the minimum keep threshold');
            }
        } catch (error) {
            console.error('[OfflineStorage] Error during automatic pruning:', error);
        }
    }

    // Scenario management
    async saveScenarioForOffline(scenario: ConversationScenario): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        console.log(`[OfflineStorage] Saving scenario for offline: ${scenario.id} (${scenario.name})`);

        try {
            const offlineData: OfflineScenarioData = {
                ...scenario,
                savedAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                exercises: {}
            };

            await this.db.put('scenarios', offlineData);

            // Update cache
            this.scenarioCache.set(scenario.id, offlineData);

            // Reload metadata
            await this.loadSavedScenarios();
            await this.calculateStorageUsage();

            // Check if we need to prune after adding
            const usage = await this.calculateStorageUsage();
            if (usage.used > this.MAX_CACHE_SIZE_BYTES) {
                console.log('[OfflineStorage] Cache limit exceeded after save, triggering automatic pruning...');
                await this.performAutomaticPruning();
            }

            console.log(`[OfflineStorage] ✓ Scenario saved successfully: ${scenario.id}`);
        } catch (error: any) {
            if (error.name === 'QuotaExceededError') {
                console.error('[OfflineStorage] ✗ Storage quota exceeded - attempting automatic pruning...');

                // Try to prune and retry
                await this.performAutomaticPruning();

                // Retry the save
                try {
                    const offlineData: OfflineScenarioData = {
                        ...scenario,
                        savedAt: new Date().toISOString(),
                        lastModified: new Date().toISOString(),
                        exercises: {}
                    };
                    await this.db!.put('scenarios', offlineData);
                    this.scenarioCache.set(scenario.id, offlineData);
                    await this.loadSavedScenarios();
                    await this.calculateStorageUsage();
                    console.log(`[OfflineStorage] ✓ Scenario saved successfully after pruning: ${scenario.id}`);
                } catch (retryError) {
                    console.error('[OfflineStorage] ✗ Failed to save scenario even after pruning');
                    throw new Error('Storage quota exceeded. Please manually remove some offline scenarios.');
                }
            } else {
                console.error('[OfflineStorage] ✗ Failed to save scenario:', error);
                throw error;
            }
        }
    }

    async removeScenarioFromOffline(scenarioId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        console.log(`[OfflineStorage] Removing scenario from offline storage: ${scenarioId}`);

        try {
            // Remove scenario
            await this.db.delete('scenarios', scenarioId);

            // Remove associated exercises
            const exercises = await this.db.getAllFromIndex('exercises', 'scenarioId', scenarioId);
            const tx = this.db.transaction('exercises', 'readwrite');
            for (const exercise of exercises) {
                await tx.store.delete([exercise.scenarioId, exercise.exerciseType]);
            }
            await tx.done;

            // Clear from cache
            this.scenarioCache.delete(scenarioId);

            // Reload metadata
            await this.loadSavedScenarios();
            await this.calculateStorageUsage();

            console.log(`[OfflineStorage] ✓ Scenario removed successfully: ${scenarioId}`);
        } catch (error) {
            console.error('[OfflineStorage] ✗ Error removing scenario from offline storage:', error);
            throw error;
        }
    }

    async getOfflineScenario(scenarioId: string): Promise<ConversationScenario | null> {
        if (!this.db) return null;

        // Check memory cache first
        if (this.scenarioCache.has(scenarioId)) {
            console.log(`[OfflineStorage] ✓ Scenario retrieved from memory cache: ${scenarioId}`);

            // Update lastModified timestamp for LRU tracking
            try {
                const data = await this.db.get('scenarios', scenarioId);
                if (data) {
                    data.lastModified = new Date().toISOString();
                    await this.db.put('scenarios', data);
                }
            } catch (error) {
                console.error('[OfflineStorage] Error updating lastModified timestamp:', error);
            }

            return this.scenarioCache.get(scenarioId)!;
        }

        try {
            const data = await this.db.get('scenarios', scenarioId);

            if (!data) {
                if (this.isOffline()) {
                    console.warn(`[OfflineStorage] ⚠ Scenario not available offline: ${scenarioId}`);
                }
                return null;
            }

            // Validate data structure
            if (!this.validateScenarioData(data)) {
                console.error('[OfflineStorage] ✗ Corrupted scenario data detected, removing from storage');
                await this.removeScenarioFromOffline(scenarioId);
                return null;
            }

            // Update lastModified timestamp for LRU tracking
            data.lastModified = new Date().toISOString();
            await this.db.put('scenarios', data);

            // Add to memory cache
            this.addToMemoryCache(scenarioId, data);

            console.log(`[OfflineStorage] ✓ Scenario retrieved from IndexedDB: ${scenarioId}`);

            return data;
        } catch (error) {
            console.error('[OfflineStorage] ✗ Error reading offline scenario:', error);
            return null;
        }
    }

    async isScenarioSavedOffline(scenarioId: string): Promise<boolean> {
        if (!this.db) return false;

        try {
            const data = await this.db.get('scenarios', scenarioId);
            return !!data;
        } catch {
            return false;
        }
    }

    private validateScenarioData(data: any): boolean {
        return !!(
            data &&
            data.id &&
            data.name &&
            data.sentences &&
            Array.isArray(data.sentences)
        );
    }

    private addToMemoryCache(scenarioId: string, data: OfflineScenarioData): void {
        // Implement LRU cache
        if (this.scenarioCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.scenarioCache.keys().next().value;
            this.scenarioCache.delete(firstKey);
        }
        this.scenarioCache.set(scenarioId, data);
    }

    // Exercise caching
    async cacheExercise(scenarioId: string, exerciseType: ExerciseType, data: any): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        console.log(`[OfflineStorage] Caching exercise: ${scenarioId} - ${exerciseType}`);

        try {
            await this.db.put('exercises', {
                scenarioId,
                exerciseType,
                data
            });

            // Update scenario's hasExercises flag and lastModified timestamp
            const scenario = await this.db.get('scenarios', scenarioId);
            if (scenario) {
                scenario.exercises[exerciseType] = data;
                scenario.lastModified = new Date().toISOString(); // Update access time for LRU
                await this.db.put('scenarios', scenario);
            }

            await this.loadSavedScenarios();
            await this.calculateStorageUsage();

            console.log(`[OfflineStorage] ✓ Exercise cached successfully: ${scenarioId} - ${exerciseType}`);
        } catch (error: any) {
            if (error.name === 'QuotaExceededError') {
                console.error('[OfflineStorage] ✗ Storage quota exceeded while caching exercise - attempting automatic pruning...');
                await this.performAutomaticPruning();

                // Retry
                try {
                    await this.db!.put('exercises', { scenarioId, exerciseType, data });
                    const scenario = await this.db!.get('scenarios', scenarioId);
                    if (scenario) {
                        scenario.exercises[exerciseType] = data;
                        scenario.lastModified = new Date().toISOString();
                        await this.db!.put('scenarios', scenario);
                    }
                    await this.loadSavedScenarios();
                    console.log(`[OfflineStorage] ✓ Exercise cached successfully after pruning: ${scenarioId} - ${exerciseType}`);
                } catch (retryError) {
                    console.error('[OfflineStorage] ✗ Failed to cache exercise even after pruning');
                    throw new Error('Storage quota exceeded. Please manually remove some offline scenarios.');
                }
            } else {
                console.error('[OfflineStorage] ✗ Error caching exercise:', error);
                throw error;
            }
        }
    }

    async getCachedExercise(scenarioId: string, exerciseType: ExerciseType): Promise<any | null> {
        if (!this.db) return null;

        try {
            const entry = await this.db.get('exercises', [scenarioId, exerciseType]);
            if (entry) {
                console.log(`[OfflineStorage] ✓ Exercise retrieved from cache: ${scenarioId} - ${exerciseType}`);
            } else if (this.isOffline()) {
                console.warn(`[OfflineStorage] ⚠ Exercise not available offline: ${scenarioId} - ${exerciseType}`);
            }
            return entry?.data || null;
        } catch (error) {
            console.error('[OfflineStorage] ✗ Error retrieving cached exercise:', error);
            return null;
        }
    }

    async cacheAllExercises(scenarioId: string, exercises: Map<ExerciseType, any>): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            const tx = this.db.transaction('exercises', 'readwrite');
            const promises = Array.from(exercises.entries()).map(([type, data]) =>
                tx.store.put({ scenarioId, exerciseType: type, data })
            );

            await Promise.all([...promises, tx.done]);

            // Update scenario
            const scenario = await this.db.get('scenarios', scenarioId);
            if (scenario) {
                exercises.forEach((data, type) => {
                    scenario.exercises[type] = data;
                });
                await this.db.put('scenarios', scenario);
            }

            await this.loadSavedScenarios();
        } catch (error) {
            console.error('Error caching exercises:', error);
            throw error;
        }
    }

    // Session state management
    async saveSessionState(state: SessionState): Promise<void> {
        if (!this.db) return;

        try {
            await this.db.put('sessionState', { ...state, key: 'current' });
        } catch (error) {
            console.error('Error saving session state:', error);
        }
    }

    async restoreSessionState(): Promise<SessionState | null> {
        if (!this.db) return null;

        try {
            const state = await this.db.get('sessionState', 'current');

            if (!state) return null;

            // Check if state is stale (older than 24 hours)
            const stateAge = Date.now() - new Date(state.timestamp).getTime();
            if (stateAge > 24 * 60 * 60 * 1000) {
                await this.clearSessionState();
                return null;
            }

            return state;
        } catch (error) {
            console.error('Error restoring session state:', error);
            return null;
        }
    }

    async clearSessionState(): Promise<void> {
        if (!this.db) return;

        try {
            await this.db.delete('sessionState', 'current');
        } catch (error) {
            console.error('Error clearing session state:', error);
        }
    }

    saveSessionStateDebounced(state: SessionState): void {
        if (this.sessionStateSaveTimer) {
            clearTimeout(this.sessionStateSaveTimer);
        }

        this.sessionStateSaveTimer = setTimeout(() => {
            this.saveSessionState(state);
        }, 1000);
    }

    private saveCurrentSessionState(): void {
        // This will be called by components to save their current state
        // Implementation depends on integration with SessionStore
    }

    // Storage management
    async calculateStorageUsage(): Promise<StorageUsage> {
        if (!this.db) {
            return { used: 0, available: 0, percentage: 0 };
        }

        try {
            let totalSize = 0;

            // Calculate scenarios size
            const scenarios = await this.db.getAll('scenarios');
            scenarios.forEach(scenario => {
                totalSize += new Blob([JSON.stringify(scenario)]).size;
            });

            // Calculate exercises size
            const exercises = await this.db.getAll('exercises');
            exercises.forEach(exercise => {
                totalSize += new Blob([JSON.stringify(exercise)]).size;
            });

            // Estimate available storage (most browsers provide ~50MB for IndexedDB)
            const estimatedAvailable = 50 * 1024 * 1024; // 50MB
            const percentage = (totalSize / estimatedAvailable) * 100;

            const usage: StorageUsage = {
                used: totalSize,
                available: estimatedAvailable - totalSize,
                percentage: Math.min(percentage, 100)
            };

            this.storageUsageSignal.set(usage);
            return usage;
        } catch (error) {
            console.error('Error calculating storage usage:', error);
            return { used: 0, available: 0, percentage: 0 };
        }
    }

    async clearAllOfflineData(): Promise<void> {
        if (!this.db) return;

        console.log('[OfflineStorage] Clearing all offline data...');

        try {
            // Clear all stores
            await this.db.clear('scenarios');
            await this.db.clear('exercises');
            await this.db.clear('sessionState');

            // Clear cache
            this.scenarioCache.clear();

            // Update state
            this.savedScenariosSignal.set([]);
            await this.calculateStorageUsage();

            console.log('[OfflineStorage] ✓ All offline data cleared successfully');
        } catch (error) {
            console.error('[OfflineStorage] ✗ Error clearing offline data:', error);
            throw error;
        }
    }

    private async loadSavedScenarios(): Promise<void> {
        if (!this.db) return;

        try {
            const scenarios = await this.db.getAll('scenarios');

            const metadata: OfflineScenarioMetadata[] = scenarios.map(scenario => ({
                id: scenario.id,
                name: scenario.name,
                difficulty_level: scenario.difficulty_level,
                savedAt: scenario.savedAt,
                lastModified: scenario.lastModified,
                size: new Blob([JSON.stringify(scenario)]).size,
                hasExercises: Object.keys(scenario.exercises || {}).length > 0
            }));

            this.savedScenariosSignal.set(metadata);
        } catch (error) {
            console.error('Error loading saved scenarios:', error);
        }
    }

    // Sync functionality
    async syncOfflineScenarios(): Promise<SyncResult> {
        if (!this.db || this.isOffline()) {
            return { updated: [], failed: [], removed: [] };
        }

        this.isSyncingSignal.set(true);

        const result: SyncResult = {
            updated: [],
            failed: [],
            removed: []
        };

        try {
            const savedScenarios = await this.db.getAll('scenarios');

            // In a real implementation, this would check with the server
            // For now, we'll just mark sync as complete
            // TODO: Implement actual server sync when API is available

            await this.loadSavedScenarios();
        } catch (error) {
            console.error('Error syncing offline scenarios:', error);
        } finally {
            this.isSyncingSignal.set(false);
        }

        return result;
    }

    // PWA-specific methods for Task 8
    async getCacheSize(): Promise<number> {
        const usage = await this.calculateStorageUsage();
        return usage.used;
    }

    async getCachedScenarioIds(): Promise<string[]> {
        if (!this.db) return [];

        try {
            const scenarios = await this.db.getAll('scenarios');
            return scenarios.map(s => s.id);
        } catch (error) {
            console.error('Error getting cached scenario IDs:', error);
            return [];
        }
    }

    async pruneOldCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
        if (!this.db) return 0;

        console.log(`[OfflineStorage] Pruning scenarios older than ${Math.floor(maxAgeMs / (24 * 60 * 60 * 1000))} days...`);

        try {
            const scenarios = await this.db.getAll('scenarios');
            const now = Date.now();
            let prunedCount = 0;

            // Sort by lastModified to ensure we keep the most recent ones
            const sortedScenarios = scenarios
                .map(s => ({
                    ...s,
                    lastModifiedTime: new Date(s.lastModified).getTime()
                }))
                .sort((a, b) => b.lastModifiedTime - a.lastModifiedTime);

            // Always keep at least MIN_SCENARIOS_TO_KEEP most recent scenarios
            const scenariosToKeep = sortedScenarios.slice(0, this.MIN_SCENARIOS_TO_KEEP);
            const scenariosToCheck = sortedScenarios.slice(this.MIN_SCENARIOS_TO_KEEP);

            for (const scenario of scenariosToCheck) {
                const age = now - scenario.lastModifiedTime;

                if (age > maxAgeMs) {
                    await this.removeScenarioFromOffline(scenario.id);
                    prunedCount++;
                    console.log(`[OfflineStorage] Pruned old scenario: ${scenario.id} (${scenario.name}) - Age: ${Math.floor(age / (24 * 60 * 60 * 1000))} days`);
                }
            }

            if (prunedCount > 0) {
                console.log(`[OfflineStorage] ✓ Age-based pruning complete: ${prunedCount} scenario(s) removed`);
                await this.loadSavedScenarios();
                await this.calculateStorageUsage();
            } else {
                console.log('[OfflineStorage] No old scenarios to prune');
            }

            return prunedCount;
        } catch (error) {
            console.error('[OfflineStorage] Error pruning old cache:', error);
            return 0;
        }
    }

    /**
     * Manually trigger cache size check and pruning if needed
     */
    async checkCacheSizeAndPrune(): Promise<void> {
        await this.checkAndPruneCache();
    }

    /**
     * Get cache statistics for monitoring
     */
    async getCacheStatistics(): Promise<{
        totalSize: number;
        scenarioCount: number;
        exerciseCount: number;
        oldestScenario: Date | null;
        newestScenario: Date | null;
        isOverLimit: boolean;
    }> {
        if (!this.db) {
            return {
                totalSize: 0,
                scenarioCount: 0,
                exerciseCount: 0,
                oldestScenario: null,
                newestScenario: null,
                isOverLimit: false
            };
        }

        try {
            const scenarios = await this.db.getAll('scenarios');
            const exercises = await this.db.getAll('exercises');
            const usage = await this.calculateStorageUsage();

            let oldestDate: Date | null = null;
            let newestDate: Date | null = null;

            if (scenarios.length > 0) {
                const dates = scenarios.map(s => new Date(s.lastModified));
                oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
                newestDate = new Date(Math.max(...dates.map(d => d.getTime())));
            }

            return {
                totalSize: usage.used,
                scenarioCount: scenarios.length,
                exerciseCount: exercises.length,
                oldestScenario: oldestDate,
                newestScenario: newestDate,
                isOverLimit: usage.used > this.MAX_CACHE_SIZE_BYTES
            };
        } catch (error) {
            console.error('[OfflineStorage] Error getting cache statistics:', error);
            return {
                totalSize: 0,
                scenarioCount: 0,
                exerciseCount: 0,
                oldestScenario: null,
                newestScenario: null,
                isOverLimit: false
            };
        }
    }

    async clearCache(): Promise<void> {
        await this.clearAllOfflineData();
        console.log('[OfflineStorage] All cache cleared');
    }

    // Utility methods
    getSaveForOfflineEnabled(): boolean {
        return localStorage.getItem('saveForOfflineEnabled') === 'true';
    }

    setSaveForOfflineEnabled(enabled: boolean): void {
        localStorage.setItem('saveForOfflineEnabled', enabled.toString());
    }

    /**
     * Cleanup method - should be called when service is destroyed
     */
    ngOnDestroy(): void {
        if (this.cacheMonitoringTimer) {
            clearInterval(this.cacheMonitoringTimer);
        }
        if (this.sessionStateSaveTimer) {
            clearTimeout(this.sessionStateSaveTimer);
        }
    }
}
