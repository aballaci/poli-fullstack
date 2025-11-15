import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ExerciseService } from '../../../services/exercise.service';
import { SessionStore } from '../../../state/session.store';
import { ThemeService } from '../../../services/theme.service';
import { SoundService } from '../../../services/sound.service';
import { WordItem, MatchingPairsExercise } from '../../../models/exercise.models';

interface SelectedCard {
    id: string;
    side: 'source' | 'target';
}

interface Match {
    sourceId: string;
    targetId: string;
}

@Component({
    selector: 'app-matching-pairs-exercise',
    standalone: true,
    imports: [CommonModule, TranslocoModule],
    templateUrl: './matching-pairs-exercise.component.html',
})
export class MatchingPairsExerciseComponent implements OnInit {
    private exerciseService = inject(ExerciseService);
    private sessionStore = inject(SessionStore);
    private router = inject(Router);
    readonly themeService = inject(ThemeService);
    private soundService = inject(SoundService);

    // Exercise data
    readonly sourceWords = signal<WordItem[]>([]);
    readonly targetWords = signal<WordItem[]>([]);
    readonly correctPairs = signal<Match[]>([]);
    readonly isLoading = signal<boolean>(true);
    readonly errorMessage = signal<string | null>(null);

    // Game state
    readonly selectedCard = signal<SelectedCard | null>(null);
    readonly hearts = signal<boolean[]>([true, true, true, true]);
    readonly matchedIds = signal<Set<string>>(new Set());
    readonly successAnimationIds = signal<Set<string>>(new Set());

    readonly scenarioId = computed(() => this.sessionStore.activeScenario()?.id);
    readonly sourceLanguage = computed(() => this.sessionStore.sourceLanguage());
    readonly targetLanguage = computed(() => this.sessionStore.targetLanguage());

    /**
     * Get flag code for language (handle special case for English)
     */
    getFlagCode(languageCode: string | undefined): string {
        if (!languageCode) return '';
        return languageCode === 'en' ? 'gb' : languageCode;
    }

    // Computed states
    readonly visibleSourceWords = computed(() =>
        this.sourceWords().filter(w => !this.matchedIds().has(w.id))
    );

    readonly visibleTargetWords = computed(() =>
        this.targetWords().filter(w => !this.matchedIds().has(w.id))
    );

    readonly remainingHearts = computed(() =>
        this.hearts().filter(h => h).length
    );

    readonly exerciseFailed = computed(() =>
        this.remainingHearts() === 0 && this.visibleSourceWords().length > 0
    );

    readonly exerciseComplete = computed(() =>
        this.visibleSourceWords().length === 0
    );

    ngOnInit(): void {
        this.loadExercise();
    }

    /**
     * Load matching pairs exercise from the service
     */
    private loadExercise(): void {
        const currentScenarioId = this.scenarioId();

        if (!currentScenarioId) {
            this.errorMessage.set('No active scenario found');
            this.isLoading.set(false);
            return;
        }

        this.exerciseService.getExercise(currentScenarioId, 'matchingPairs').subscribe({
            next: (data) => {
                if (data && 'sourceWords' in data) {
                    const matchingData = data as MatchingPairsExercise;
                    this.sourceWords.set(matchingData.sourceWords);

                    // Randomize target words order
                    const shuffledTargets = [...matchingData.targetWords].sort(() => Math.random() - 0.5);
                    this.targetWords.set(shuffledTargets);

                    this.correctPairs.set(matchingData.correctPairs.map(p => ({
                        sourceId: p.sourceId,
                        targetId: p.targetId
                    })));
                    this.isLoading.set(false);
                } else {
                    this.errorMessage.set('No matching pairs exercise available for this scenario');
                    this.isLoading.set(false);
                }
            },
            error: (error) => {
                console.error('Error loading matching pairs exercise:', error);
                this.errorMessage.set('Failed to load exercise. Please try again.');
                this.isLoading.set(false);
            }
        });
    }

    /**
     * Handle card selection
     */
    selectCard(cardId: string, side: 'source' | 'target'): void {
        // Don't allow selection if exercise is over
        if (this.exerciseFailed() || this.exerciseComplete()) return;

        const currentSelection = this.selectedCard();

        // If no card is selected, select this one
        if (!currentSelection) {
            this.selectedCard.set({ id: cardId, side });
            return;
        }

        // If clicking the same card, deselect it
        if (currentSelection.id === cardId && currentSelection.side === side) {
            this.selectedCard.set(null);
            return;
        }

        // If clicking a card from the same side, switch selection
        if (currentSelection.side === side) {
            this.selectedCard.set({ id: cardId, side });
            return;
        }

        // Clicking a card from the opposite side - attempt match
        const sourceId = side === 'source' ? cardId : currentSelection.id;
        const targetId = side === 'target' ? cardId : currentSelection.id;

        this.attemptMatch(sourceId, targetId);
    }

    /**
     * Attempt to match two cards
     */
    private attemptMatch(sourceId: string, targetId: string): void {
        const isCorrect = this.correctPairs().some(
            p => p.sourceId === sourceId && p.targetId === targetId
        );

        if (isCorrect) {
            // Play success sound
            this.soundService.playSuccess();

            // Show success animation
            this.successAnimationIds.update(ids => {
                const newIds = new Set(ids);
                newIds.add(sourceId);
                newIds.add(targetId);
                return newIds;
            });

            // After animation, remove both cards
            setTimeout(() => {
                this.matchedIds.update(ids => {
                    const newIds = new Set(ids);
                    newIds.add(sourceId);
                    newIds.add(targetId);
                    return newIds;
                });

                // Clear success animation
                this.successAnimationIds.update(ids => {
                    const newIds = new Set(ids);
                    newIds.delete(sourceId);
                    newIds.delete(targetId);
                    return newIds;
                });
            }, 600);
        } else {
            // Play failure sound
            this.soundService.playFailure();

            // Incorrect match - remove a heart
            this.removeHeart();
        }

        // Clear selection
        this.selectedCard.set(null);
    }

    /**
     * Remove one heart
     */
    private removeHeart(): void {
        this.hearts.update(hearts => {
            const newHearts = [...hearts];
            const firstTrueIndex = newHearts.findIndex(h => h);
            if (firstTrueIndex !== -1) {
                newHearts[firstTrueIndex] = false;
            }
            return newHearts;
        });
    }

    /**
     * Check if a card is selected
     */
    isCardSelected(cardId: string, side: 'source' | 'target'): boolean {
        const selected = this.selectedCard();
        return selected !== null && selected.id === cardId && selected.side === side;
    }

    /**
     * Check if a card is showing success animation
     */
    isSuccessAnimating(cardId: string): boolean {
        return this.successAnimationIds().has(cardId);
    }

    /**
     * Retry the exercise
     */
    retry(): void {
        // Reset hearts
        this.hearts.set([true, true, true, true]);

        // Reset matched IDs
        this.matchedIds.set(new Set());

        // Clear success animation
        this.successAnimationIds.set(new Set());

        // Clear selection
        this.selectedCard.set(null);

        // Re-randomize target words
        const shuffledTargets = [...this.targetWords()].sort(() => Math.random() - 0.5);
        this.targetWords.set(shuffledTargets);
    }

    /**
     * Finish the exercise and mark as completed
     */
    finish(): void {
        this.exerciseService.markExerciseCompleted('matchingPairs');
        this.goBack();
    }

    /**
     * Navigate back to the main exercise view
     */
    goBack(): void {
        this.router.navigate(['/conversation'], {
            state: { step: 'Exercises' }
        });
    }
}
