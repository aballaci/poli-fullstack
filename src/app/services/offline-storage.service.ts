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

    constructor() {
        this.initializeDatabase();
        this.setupNetworkListeners();
        this.loadSavedScenarios();
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

    // Scenario management
    async saveScenarioForOffline(scenario: ConversationScenario): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

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
        } catch (error: any) {
            if (error.name === 'QuotaExceededError') {
                throw new Error('Storage quota exceeded. Please remove some offline scenarios.');
            }
            throw error;
        }
    }

    async removeScenarioFromOffline(scenarioId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

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
        } catch (error) {
            console.error('Error removing scenario from offline storage:', error);
            throw error;
        }
    }

    async getOfflineScenario(scenarioId: string): Promise<ConversationScenario | null> {
        if (!this.db) return null;

        // Check memory cache first
        if (this.scenarioCache.has(scenarioId)) {
            return this.scenarioCache.get(scenarioId)!;
        }

        try {
            const data = await this.db.get('scenarios', scenarioId);

            if (!data) return null;

            // Validate data structure
            if (!this.validateScenarioData(data)) {
                console.error('Corrupted scenario data, removing from storage');
                await this.removeScenarioFromOffline(scenarioId);
                return null;
            }

            // Add to memory cache
            this.addToMemoryCache(scenarioId, data);

            return data;
        } catch (error) {
            console.error('Error reading offline scenario:', error);
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

        try {
            await this.db.put('exercises', {
                scenarioId,
                exerciseType,
                data
            });

            // Update scenario's hasExercises flag
            const scenario = await this.db.get('scenarios', scenarioId);
            if (scenario) {
                scenario.exercises[exerciseType] = data;
                await this.db.put('scenarios', scenario);
            }

            await this.loadSavedScenarios();
        } catch (error) {
            console.error('Error caching exercise:', error);
            throw error;
        }
    }

    async getCachedExercise(scenarioId: string, exerciseType: ExerciseType): Promise<any | null> {
        if (!this.db) return null;

        try {
            const entry = await this.db.get('exercises', [scenarioId, exerciseType]);
            return entry?.data || null;
        } catch (error) {
            console.error('Error retrieving cached exercise:', error);
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
        } catch (error) {
            console.error('Error clearing offline data:', error);
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

        try {
            const scenarios = await this.db.getAll('scenarios');
            const now = Date.now();
            let prunedCount = 0;

            for (const scenario of scenarios) {
                const lastModified = new Date(scenario.lastModified).getTime();
                const age = now - lastModified;

                if (age > maxAgeMs) {
                    await this.removeScenarioFromOffline(scenario.id);
                    prunedCount++;
                    console.log(`[OfflineStorage] Pruned old scenario: ${scenario.id} (age: ${Math.floor(age / (24 * 60 * 60 * 1000))} days)`);
                }
            }

            if (prunedCount > 0) {
                await this.loadSavedScenarios();
                await this.calculateStorageUsage();
            }

            return prunedCount;
        } catch (error) {
            console.error('Error pruning old cache:', error);
            return 0;
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
}
