import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ExerciseService } from '../../../services/exercise.service';
import { SessionStore } from '../../../state/session.store';
import { ThemeService } from '../../../services/theme.service';
import { SentenceScrambleExercise, SentenceScrambleExercises } from '../../../models/exercise.models';

@Component({
    selector: 'app-sentence-scramble-exercise',
    standalone: true,
    imports: [CommonModule, TranslocoModule],
    templateUrl: './sentence-scramble-exercise.component.html',
})
export class SentenceScrambleExerciseComponent implements OnInit {
    private exerciseService = inject(ExerciseService);
    private sessionStore = inject(SessionStore);
    private router = inject(Router);
    readonly themeService = inject(ThemeService);

    // Exercise data
    readonly exercises = signal<SentenceScrambleExercise[]>([]);
    readonly currentIndex = signal<number>(0);
    readonly availableWords = signal<string[]>([]);
    readonly targetWords = signal<string[]>([]);
    readonly showAnswer = signal<boolean>(false);
    readonly isLoading = signal<boolean>(true);
    readonly errorMessage = signal<string | null>(null);

    // Drag state
    readonly draggedWord = signal<string | null>(null);
    readonly draggedFrom = signal<'available' | 'target' | null>(null);
    readonly draggedIndex = signal<number | null>(null);

    // Computed properties
    readonly currentExercise = computed(() => {
        const exercises = this.exercises();
        const index = this.currentIndex();
        return exercises[index] || null;
    });

    readonly isLastExercise = computed(() => {
        return this.currentIndex() === this.exercises().length - 1;
    });

    readonly scenarioId = computed(() => this.sessionStore.activeScenario()?.id);

    readonly correctSentence = computed(() => {
        const exercise = this.currentExercise();
        if (!exercise) return '';
        return exercise.correctOrder.map(i => exercise.scrambledWords[i]).join(' ');
    });

    ngOnInit(): void {
        this.loadExercises();
    }

    /**
     * Load sentence scramble exercises from the service
     */
    private loadExercises(): void {
        const currentScenarioId = this.scenarioId();

        if (!currentScenarioId) {
            this.errorMessage.set('No active scenario found');
            this.isLoading.set(false);
            return;
        }

        this.exerciseService.getExercise(currentScenarioId, 'sentenceScramble').subscribe({
            next: (data) => {
                if (data && 'exercises' in data) {
                    const scrambleData = data as SentenceScrambleExercises;
                    this.exercises.set(scrambleData.exercises);
                    this.initializeUserOrder();
                    this.isLoading.set(false);
                } else {
                    this.errorMessage.set('No sentence scramble exercises available for this scenario');
                    this.isLoading.set(false);
                }
            },
            error: (error) => {
                console.error('Error loading sentence scramble exercises:', error);
                this.errorMessage.set('Failed to load exercises. Please try again.');
                this.isLoading.set(false);
            }
        });
    }

    /**
     * Initialize available words with scrambled words and empty target
     */
    private initializeUserOrder(): void {
        const exercise = this.currentExercise();
        if (exercise) {
            this.availableWords.set([...exercise.scrambledWords]);
            this.targetWords.set([]);
        }
    }

    /**
     * Handle drag start event
     */
    onDragStart(event: DragEvent, word: string, from: 'available' | 'target', index: number): void {
        if (this.showAnswer()) return;
        this.draggedWord.set(word);
        this.draggedFrom.set(from);
        this.draggedIndex.set(index);
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
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
     * Handle drop on target area
     */
    onDropToTarget(event: DragEvent, dropIndex?: number): void {
        if (this.showAnswer()) return;
        event.preventDefault();

        const word = this.draggedWord();
        const from = this.draggedFrom();
        const dragIndex = this.draggedIndex();

        if (!word || !from) return;

        if (from === 'available') {
            // Move from available to target
            this.availableWords.update(words => words.filter((_, i) => i !== dragIndex));

            if (dropIndex !== undefined) {
                // Insert at specific position
                this.targetWords.update(words => {
                    const newWords = [...words];
                    newWords.splice(dropIndex, 0, word);
                    return newWords;
                });
            } else {
                // Add to end
                this.targetWords.update(words => [...words, word]);
            }
        } else if (from === 'target' && dropIndex !== undefined && dropIndex !== dragIndex) {
            // Reorder within target
            this.targetWords.update(words => {
                const newWords = [...words];
                newWords.splice(dragIndex!, 1);
                newWords.splice(dropIndex, 0, word);
                return newWords;
            });
        }

        this.clearDragState();
    }

    /**
     * Handle drop back to available area
     */
    onDropToAvailable(event: DragEvent): void {
        if (this.showAnswer()) return;
        event.preventDefault();

        const word = this.draggedWord();
        const from = this.draggedFrom();
        const dragIndex = this.draggedIndex();

        if (!word || from !== 'target') return;

        // Move from target back to available
        this.targetWords.update(words => words.filter((_, i) => i !== dragIndex));
        this.availableWords.update(words => [...words, word]);

        this.clearDragState();
    }

    /**
     * Clear drag state
     */
    private clearDragState(): void {
        this.draggedWord.set(null);
        this.draggedFrom.set(null);
        this.draggedIndex.set(null);
    }

    /**
     * Check if a word is in the correct position
     */
    isCorrectPosition(index: number): boolean {
        const exercise = this.currentExercise();
        if (!exercise) return false;

        const userWord = this.targetWords()[index];
        const correctWord = exercise.scrambledWords[exercise.correctOrder[index]];
        return userWord === correctWord;
    }

    /**
     * Check if all words are placed in target
     */
    allWordsPlaced(): boolean {
        const exercise = this.currentExercise();
        if (!exercise) return false;
        return this.targetWords().length === exercise.scrambledWords.length;
    }

    /**
     * Validate the word order
     */
    checkOrder(): void {
        this.showAnswer.set(true);
    }

    /**
     * Navigate to the next exercise
     */
    nextExercise(): void {
        if (!this.isLastExercise()) {
            this.currentIndex.update(index => index + 1);
            this.initializeUserOrder();
            this.showAnswer.set(false);
        }
    }

    /**
     * Finish the exercise and mark as completed
     */
    finish(): void {
        this.exerciseService.markExerciseCompleted('sentenceScramble');
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

