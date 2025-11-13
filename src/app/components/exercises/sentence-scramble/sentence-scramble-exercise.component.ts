import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExerciseService } from '../../../services/exercise.service';
import { SessionStore } from '../../../state/session.store';
import { SentenceScrambleExercise, SentenceScrambleExercises } from '../../../models/exercise.models';

@Component({
    selector: 'app-sentence-scramble-exercise',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sentence-scramble-exercise.component.html',
})
export class SentenceScrambleExerciseComponent implements OnInit {
    private exerciseService = inject(ExerciseService);
    private sessionStore = inject(SessionStore);
    private router = inject(Router);

    // Exercise data
    readonly exercises = signal<SentenceScrambleExercise[]>([]);
    readonly currentIndex = signal<number>(0);
    readonly userOrder = signal<string[]>([]);
    readonly showAnswer = signal<boolean>(false);
    readonly isLoading = signal<boolean>(true);
    readonly errorMessage = signal<string | null>(null);

    // Drag state
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
     * Initialize user order with scrambled words
     */
    private initializeUserOrder(): void {
        const exercise = this.currentExercise();
        if (exercise) {
            this.userOrder.set([...exercise.scrambledWords]);
        }
    }

    /**
     * Handle drag start event
     */
    onDragStart(event: DragEvent, index: number): void {
        if (this.showAnswer()) return;
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
     * Handle drop event
     */
    onDrop(event: DragEvent, dropIndex: number): void {
        if (this.showAnswer()) return;
        event.preventDefault();

        const dragIndex = this.draggedIndex();
        if (dragIndex === null || dragIndex === dropIndex) return;

        // Swap the words
        this.userOrder.update(order => {
            const newOrder = [...order];
            const temp = newOrder[dragIndex];
            newOrder[dragIndex] = newOrder[dropIndex];
            newOrder[dropIndex] = temp;
            return newOrder;
        });

        this.draggedIndex.set(null);
    }

    /**
     * Handle touch start for mobile
     */
    onTouchStart(event: TouchEvent, index: number): void {
        if (this.showAnswer()) return;
        this.draggedIndex.set(index);
    }

    /**
     * Handle touch end for mobile
     */
    onTouchEnd(event: TouchEvent, dropIndex: number): void {
        if (this.showAnswer()) return;

        const dragIndex = this.draggedIndex();
        if (dragIndex === null || dragIndex === dropIndex) return;

        // Swap the words
        this.userOrder.update(order => {
            const newOrder = [...order];
            const temp = newOrder[dragIndex];
            newOrder[dragIndex] = newOrder[dropIndex];
            newOrder[dropIndex] = temp;
            return newOrder;
        });

        this.draggedIndex.set(null);
    }

    /**
     * Check if a word is in the correct position
     */
    isCorrectPosition(index: number): boolean {
        const exercise = this.currentExercise();
        if (!exercise) return false;

        const userWord = this.userOrder()[index];
        const correctWord = exercise.scrambledWords[exercise.correctOrder[index]];
        return userWord === correctWord;
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
        this.router.navigate(['/conversation']);
    }
}

