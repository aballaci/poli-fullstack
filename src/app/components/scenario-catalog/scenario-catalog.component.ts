import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { GeminiService } from '../../services/gemini.service';
import { SessionStore } from '../../state/session.store';
import { ScenarioSummary } from '../../models';
import { TranslocoModule } from '@jsverse/transloco';
import { OfflineStorageService } from '../../services/offline-storage.service';

@Component({
    selector: 'app-scenario-catalog',
    standalone: true,
    imports: [CommonModule, TranslocoModule],
    templateUrl: './scenario-catalog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioCatalogComponent implements OnInit, OnDestroy {
    geminiService = inject(GeminiService);
    store = inject(SessionStore);
    router = inject(Router);
    route = inject(ActivatedRoute);
    offlineService = inject(OfflineStorageService);

    // Catalog state
    scenarios = signal<ScenarioSummary[]>([]);
    selectedScenarioId = signal<string | null>(null);
    filterByCurrentLevel = signal(false);
    showOfflineOnly = signal(false);
    loadingMessage = signal('Loading scenarios...');
    error = signal<string | null>(null);
    savingScenarioId = signal<string | null>(null);

    // Flatten catalog to a simple list for card display
    readonly catalogList = computed(() => {
        const scenarios = this.scenarios();
        const currentDifficulty = this.store.difficultyLevel();
        const filterByLevel = this.filterByCurrentLevel();
        const offlineOnly = this.showOfflineOnly();
        const savedScenarios = this.offlineService.savedScenarios();

        // Filter by current difficulty level if toggle is on
        let filteredScenarios = filterByLevel && currentDifficulty
            ? scenarios.filter(s => s.difficulty_level === currentDifficulty)
            : scenarios;

        // Filter by offline availability if toggle is on
        if (offlineOnly) {
            const savedIds = new Set(savedScenarios.map(s => s.id));
            filteredScenarios = filteredScenarios.filter(s => savedIds.has(s.id));
        }

        // Sort by name alphabetically
        return filteredScenarios.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Helper to get difficulty level tag color and text with sweet colors
    getDifficultyTag(difficulty: string): { text: string; bgColor: string; textColor: string } {
        const level = difficulty.toUpperCase();
        if (level === 'A1' || level === 'A2') {
            // Soft mint/emerald for beginner
            return { text: 'Beginner', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-300' };
        } else if (level === 'B1' || level === 'B2') {
            // Soft peach/amber for intermediate
            return { text: 'Intermediate', bgColor: 'bg-amber-50 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-300' };
        } else if (level === 'C1' || level === 'C2') {
            // Soft rose/pink for advanced
            return { text: 'Advanced', bgColor: 'bg-rose-50 dark:bg-rose-900/30', textColor: 'text-rose-600 dark:text-rose-300' };
        }
        return { text: difficulty, bgColor: 'bg-slate-100 dark:bg-slate-700', textColor: 'text-slate-600 dark:text-slate-300' };
    }

    // Helper to get difficulty tag classes as a single string
    getDifficultyTagClasses(difficulty: string): string {
        const tag = this.getDifficultyTag(difficulty);
        return `px-2.5 py-1 rounded-md text-xs font-medium ${tag.bgColor} ${tag.textColor}`;
    }

    // Helper to get difficulty tag text
    getDifficultyTagText(difficulty: string): string {
        return this.getDifficultyTag(difficulty).text;
    }

    // Helper to get category tag (derive from topic or use generic)
    getCategoryTag(topic?: string): string {
        if (!topic) return 'General';
        // Extract main category from topic (first part before comma)
        return topic.split(',')[0].trim();
    }

    // Loading state
    private loadingInterval: any;
    private loadingMessages = [
        'Loading scenarios...',
        'Fetching available scenarios...',
        'Almost there...'
    ];

    ngOnInit(): void {
        this.loadCatalog();

        // Check if offline filter is requested via query param
        this.route.queryParams.subscribe(params => {
            if (params['offline'] === 'true') {
                this.showOfflineOnly.set(true);
            }
        });
    }

    private startLoadingMessages(): void {
        this.loadingMessage.set(this.loadingMessages[0]);
        let messageIndex = 1;
        this.loadingInterval = setInterval(() => {
            this.loadingMessage.set(this.loadingMessages[messageIndex % this.loadingMessages.length]);
            messageIndex++;
        }, 3500);
    }

    private stopLoadingMessages(): void {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
    }

    async loadCatalog(): Promise<void> {
        const sourceLang = this.store.sourceLanguage();
        const targetLang = this.store.targetLanguage();
        console.log('[ScenarioCatalog] Loading catalog for:', { sourceLang: sourceLang?.display_name, targetLang: targetLang?.display_name });
        if (!sourceLang || !targetLang) {
            // Cannot load catalog without languages set.
            console.warn('[ScenarioCatalog] Cannot load catalog: languages not set');
            return;
        }
        this.error.set(null);
        try {
            const scenarios = await this.geminiService.listPracticeScenarios(sourceLang, targetLang);
            console.log('[ScenarioCatalog] Loaded scenarios:', scenarios.length);
            this.scenarios.set(scenarios);
            if (scenarios.length === 0) {
                console.warn('[ScenarioCatalog] No scenarios found. Check if Mock API mode is enabled or if database is empty.');
            }
        } catch (e: any) {
            console.error('[ScenarioCatalog] Failed to load catalog', e);
            this.error.set(`Could not load scenario catalog: ${e.message}`);
        }
    }

    async loadScenario(id: string): Promise<void> {
        this.selectedScenarioId.set(id);
        this.error.set(null);
        this.startLoadingMessages();
        try {
            let scenario;

            // Try to load from offline storage first if offline
            if (this.offlineService.isOffline()) {
                scenario = await this.offlineService.getOfflineScenario(id);
                if (!scenario) {
                    throw new Error('This scenario is not available offline');
                }
            } else {
                scenario = await this.geminiService.getScenarioById(id);
                // Auto-save for offline if enabled
                if (this.offlineService.getSaveForOfflineEnabled()) {
                    await this.offlineService.saveScenarioForOffline(scenario);
                }
            }

            this.store.startConversation(scenario);
            // Save to history when loading from catalog (only if online)
            if (!this.offlineService.isOffline()) {
                await this.geminiService.saveToHistory(scenario);
            }
            this.router.navigate(['/conversation']);
        } catch (e: any) {
            console.error(`[ScenarioCatalog] Error loading scenario ${id}`, e);
            this.error.set(e.message || 'An unexpected error occurred while loading the scenario.');
        } finally {
            this.stopLoadingMessages();
            this.selectedScenarioId.set(null);
        }
    }

    async saveScenarioForOffline(id: string): Promise<void> {
        this.savingScenarioId.set(id);
        try {
            const scenario = await this.geminiService.getScenarioById(id);
            await this.offlineService.saveScenarioForOffline(scenario);
        } catch (e: any) {
            console.error(`[ScenarioCatalog] Error saving scenario ${id} for offline`, e);
            this.error.set(e.message || 'Failed to save scenario for offline use.');
        } finally {
            this.savingScenarioId.set(null);
        }
    }

    async removeFromOffline(id: string): Promise<void> {
        try {
            await this.offlineService.removeScenarioFromOffline(id);
        } catch (e: any) {
            console.error(`[ScenarioCatalog] Error removing scenario ${id} from offline`, e);
            this.error.set(e.message || 'Failed to remove scenario from offline storage.');
        }
    }

    isScenarioOffline(id: string): boolean {
        const savedScenarios = this.offlineService.savedScenarios();
        return savedScenarios.some(s => s.id === id);
    }

    formatDate(): string {
        // Return a placeholder date for now - could be enhanced with actual scenario creation date
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    }

    ngOnDestroy(): void {
        this.stopLoadingMessages();
    }
}

