import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GeminiService } from '../../services/gemini.service';
import { SessionStore } from '../../state/session.store';
import { ScenarioSummary } from '../../models';

@Component({
    selector: 'app-scenario-catalog',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './scenario-catalog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioCatalogComponent implements OnInit, OnDestroy {
    geminiService = inject(GeminiService);
    store = inject(SessionStore);
    router = inject(Router);

    // Catalog state
    scenarios = signal<ScenarioSummary[]>([]);
    selectedScenarioId = signal<string | null>(null);
    filterByCurrentLevel = signal(false);
    loadingMessage = signal('Loading scenarios...');
    error = signal<string | null>(null);

    // Flatten catalog to a simple list for card display
    readonly catalogList = computed(() => {
        const scenarios = this.scenarios();
        const currentDifficulty = this.store.difficultyLevel();
        const filterByLevel = this.filterByCurrentLevel();

        // Filter by current difficulty level if toggle is on
        let filteredScenarios = filterByLevel && currentDifficulty
            ? scenarios.filter(s => s.difficulty_level === currentDifficulty)
            : scenarios;

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
        if (!sourceLang || !targetLang) {
            // Cannot load catalog without languages set.
            return;
        }
        this.error.set(null);
        try {
            const scenarios = await this.geminiService.listPracticeScenarios(sourceLang, targetLang);
            this.scenarios.set(scenarios);
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
            const scenario = await this.geminiService.getScenarioById(id);
            this.store.startConversation(scenario);
            // Save to history when loading from catalog
            await this.geminiService.saveToHistory(scenario);
            this.router.navigate(['/conversation']);
        } catch (e: any) {
            console.error(`[ScenarioCatalog] Error loading scenario ${id}`, e);
            this.error.set(e.message || 'An unexpected error occurred while loading the scenario.');
        } finally {
            this.stopLoadingMessages();
            this.selectedScenarioId.set(null);
        }
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

