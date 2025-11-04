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

    // Organized catalog by topic and difficulty
    readonly organizedCatalog = computed(() => {
        const scenarios = this.scenarios();
        const currentDifficulty = this.store.difficultyLevel();
        const filterByLevel = this.filterByCurrentLevel();

        // Filter by current difficulty level if toggle is on
        const filteredScenarios = filterByLevel && currentDifficulty
            ? scenarios.filter(s => s.difficulty_level === currentDifficulty)
            : scenarios;

        const organized: { [topic: string]: { [difficulty: string]: ScenarioSummary[] } } = {};

        const difficultyOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

        for (const scenario of filteredScenarios) {
            const topic = scenario.topic || 'Other';
            const difficulty = scenario.difficulty_level;

            if (!organized[topic]) {
                organized[topic] = {};
            }
            if (!organized[topic][difficulty]) {
                organized[topic][difficulty] = [];
            }
            organized[topic][difficulty].push(scenario);
        }

        // Sort topics alphabetically
        const sortedTopics = Object.keys(organized).sort();
        const result: { topic: string; difficulties: { difficulty: string; scenarios: ScenarioSummary[] }[] }[] = [];

        for (const topic of sortedTopics) {
            const difficulties: { difficulty: string; scenarios: ScenarioSummary[] }[] = [];
            // Sort difficulties in order
            for (const diff of difficultyOrder) {
                if (organized[topic][diff]) {
                    difficulties.push({
                        difficulty: diff,
                        scenarios: organized[topic][diff]
                    });
                }
            }
            // Add any difficulties not in the standard list
            for (const diff of Object.keys(organized[topic])) {
                if (!difficultyOrder.includes(diff)) {
                    difficulties.push({
                        difficulty: diff,
                        scenarios: organized[topic][diff]
                    });
                }
            }
            result.push({ topic, difficulties });
        }

        return result;
    });

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
            this.router.navigate(['/conversation']);
        } catch (e: any) {
            console.error(`[ScenarioCatalog] Error loading scenario ${id}`, e);
            this.error.set(e.message || 'An unexpected error occurred while loading the scenario.');
        } finally {
            this.stopLoadingMessages();
            this.selectedScenarioId.set(null);
        }
    }

    ngOnDestroy(): void {
        this.stopLoadingMessages();
    }
}

