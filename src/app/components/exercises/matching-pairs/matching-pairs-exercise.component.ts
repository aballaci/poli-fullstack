import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExerciseService } from '../../../services/exercise.service';
import { SessionStore } from '../../../state/session.store';
import { SentenceItem, MatchingPairsExercise } from '../../../models/exercise.models';

interface Match {
    sourceId: string;
    targetId: string;
}

@Component({
    selector: 'app-matching-pairs-exercise',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './matching-pairs-exercise.component.html',
})
export class MatchingPairsExerciseComponent implements OnInit {
    private exerciseService = inject(ExerciseService);
    private sessionStore = inject(SessionStore);
    private router = inject(Router);

    // Exercise data
    readonly sourceSentences = signal<SentenceItem[]>([]);
    readonly targetSentences = signal<SentenceItem[]>([]);
    readonly userMatches = signal<Match[]>([]);
    readonly correctPairs = signal<Match[]>([]);
    readonly showAnswer = signal<boolean>(false);
    readonly isLoading = signal<boolean>(true);
    readonly errorMessage = signal<string | null>(null);

    // Drag state
    readonly draggedItemId = signal<string | null>(null);
    readonly draggedFromSource = signal<boolean>(false);

    // Touch state for mobile
    private touchStartX = 0;
    private touchStartY = 0;

    readonly scenarioId = computed(() => this.sessionStore.activeScenario()?.id);

    readonly allMatched = computed(() => {
        return this.userMatches().length === this.sourceSentences().length;
    });

    readonly allCorrect = computed(() => {
        return this.userMatches().every(m => this.isCorrectMatch(m.sourceId, m.targetId));
    });

    readonly someIncorrect = computed(() => {
        return !this.allCorrect();
    });

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
                if (data && 'sourceSentences' in data) {
                    const matchingData = data as MatchingPairsExercise;
                    this.sourceSentences.set(matchingData.sourceSentences);
                    this.targetSentences.set(matchingData.targetSentences);
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
     * Handle drag start event
     */
    onDragStart(event: DragEvent, itemId: string, isSource: boolean): void {
        if (this.showAnswer()) return;

        this.draggedItemId.set(itemId);
        this.draggedFromSource.set(isSource);

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', itemId);
        }
    }

    /**
     * Handle drag over event
     */
    onDragOver(event: DragEvent): void {
        if (this.showAnswer()) return;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    /**
     * Handle drop event
     */
    onDrop(event: DragEvent, targetId: string, isTargetSource: boolean): void {
        if (this.showAnswer()) return;
        event.preventDefault();

        const draggedId = this.draggedItemId();
        const fromSource = this.draggedFromSource();

        if (!draggedId) return;

        // Only allow matching source to target or target to source
        if (fromSource === isTargetSource) return;

        // Create the match
        const sourceId = fromSource ? draggedId : targetId;
        const targetIdMatch = fromSource ? targetId : draggedId;

        // Remove any existing matches with these IDs
        this.userMatches.update(matches =>
            matches.filter(m => m.sourceId !== sourceId && m.targetId !== targetIdMatch)
        );

        // Add new match
        this.userMatches.update(matches => [
            ...matches,
            { sourceId, targetId: targetIdMatch }
        ]);

        this.draggedItemId.set(null);
        this.draggedFromSource.set(false);
    }

    /**
     * Handle touch start for mobile
     */
    onTouchStart(event: TouchEvent, itemId: string, isSource: boolean): void {
        if (this.showAnswer()) return;

        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;

        this.draggedItemId.set(itemId);
        this.draggedFromSource.set(isSource);
    }

    /**
     * Handle touch end for mobile
     */
    onTouchEnd(event: TouchEvent, targetId: string, isTargetSource: boolean): void {
        if (this.showAnswer()) return;

        const draggedId = this.draggedItemId();
        const fromSource = this.draggedFromSource();

        if (!draggedId) return;

        // Only allow matching source to target or target to source
        if (fromSource === isTargetSource) return;

        // Create the match
        const sourceId = fromSource ? draggedId : targetId;
        const targetIdMatch = fromSource ? targetId : draggedId;

        // Remove any existing matches with these IDs
        this.userMatches.update(matches =>
            matches.filter(m => m.sourceId !== sourceId && m.targetId !== targetIdMatch)
        );

        // Add new match
        this.userMatches.update(matches => [
            ...matches,
            { sourceId, targetId: targetIdMatch }
        ]);

        this.draggedItemId.set(null);
        this.draggedFromSource.set(false);
    }

    /**
     * Check if an item is matched
     */
    isMatched(itemId: string): boolean {
        return this.userMatches().some(m => m.sourceId === itemId || m.targetId === itemId);
    }

    /**
     * Get the match for a source item
     */
    getMatchForSource(sourceId: string): string | null {
        const match = this.userMatches().find(m => m.sourceId === sourceId);
        return match ? match.targetId : null;
    }

    /**
     * Get the target sentence text for a matched source
     */
    getMatchedTargetText(sourceId: string): string {
        const targetId = this.getMatchForSource(sourceId);
        if (!targetId) return '';
        const target = this.targetSentences().find(t => t.id === targetId);
        return target ? target.text : '';
    }

    /**
     * Check if a match is correct
     */
    isCorrectMatch(sourceId: string, targetId: string): boolean {
        return this.correctPairs().some(p => p.sourceId === sourceId && p.targetId === targetId);
    }

    /**
     * Check if a source item has a correct match
     */
    hasCorrectMatch(sourceId: string): boolean {
        const userMatch = this.userMatches().find(m => m.sourceId === sourceId);
        if (!userMatch) return false;
        return this.isCorrectMatch(sourceId, userMatch.targetId);
    }

    /**
     * Validate all matches
     */
    checkMatches(): void {
        if (!this.allMatched()) return;
        this.showAnswer.set(true);
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
        this.router.navigate(['/conversation']);
    }

    /**
     * Remove a match
     */
    removeMatch(sourceId: string): void {
        if (this.showAnswer()) return;
        this.userMatches.update(matches => matches.filter(m => m.sourceId !== sourceId));
    }
}
