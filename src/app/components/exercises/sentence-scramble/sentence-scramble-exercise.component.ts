import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ExerciseService } from '../../../services/exercise.service';
import { SessionStore } from '../../../state/session.store';
import { ThemeService } from '../../../services/theme.service';
import { SoundService } from '../../../services/sound.service';
import { TouchService } from '../../../services/touch.service';
import { ViewportService } from '../../../services/viewport.service';
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
    private soundService = inject(SoundService);
    private touchService = inject(TouchService);
    readonly viewportService = inject(ViewportService);

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

    // Touch state
    readonly touchState = signal<{
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        element: HTMLElement | null;
        word: string | null;
        from: 'available' | 'target' | null;
        index: number | null;
        isDragging: boolean;
        holdTimer: any;
    } | null>(null);

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

        // Check if all words are in correct positions
        const exercise = this.currentExercise();
        if (!exercise) return;

        const allCorrect = this.targetWords().every((word, index) => {
            const correctWord = exercise.scrambledWords[exercise.correctOrder[index]];
            return word === correctWord;
        });

        // Play appropriate sound
        if (allCorrect) {
            this.soundService.playSuccess();
        } else {
            this.soundService.playFailure();
        }
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

    /**
     * Handle touch start event
     */
    onTouchStart(event: TouchEvent, word: string, from: 'available' | 'target', index: number): void {
        if (this.showAnswer()) return;

        const touch = event.touches[0];
        const element = event.target as HTMLElement;

        // Initialize touch state
        this.touchState.set({
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            element,
            word,
            from,
            index,
            isDragging: false,
            holdTimer: null
        });

        // Set hold timer to activate drag mode after 200ms
        const holdTimer = setTimeout(() => {
            const state = this.touchState();
            if (state && !state.isDragging) {
                // Check if there was minimal movement (not a scroll)
                const gesture = this.touchService.detectGesture(
                    state.startX,
                    state.startY,
                    state.currentX,
                    state.currentY
                );

                if (gesture.type !== 'scroll') {
                    // Activate drag mode
                    this.touchState.update(s => s ? { ...s, isDragging: true } : null);
                    this.draggedWord.set(word);
                    this.draggedFrom.set(from);
                    this.draggedIndex.set(index);

                    // Add visual feedback
                    element.style.transform = 'scale(1.05)';
                    element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }
            }
        }, 200);

        this.touchState.update(s => s ? { ...s, holdTimer } : null);
    }

    /**
     * Handle touch move event
     */
    onTouchMove(event: TouchEvent): void {
        const state = this.touchState();
        if (!state) return;

        const touch = event.touches[0];
        this.touchState.update(s => s ? {
            ...s,
            currentX: touch.clientX,
            currentY: touch.clientY
        } : null);

        // Detect gesture type
        const gesture = this.touchService.detectGesture(
            state.startX,
            state.startY,
            touch.clientX,
            touch.clientY
        );

        // If scroll detected, clear hold timer and disable drag
        if (gesture.type === 'scroll') {
            if (state.holdTimer) {
                clearTimeout(state.holdTimer);
            }
            this.touchState.set(null);
            this.clearDragState();
            return;
        }

        // If dragging, prevent default and update visual position
        if (state.isDragging) {
            event.preventDefault();
            if (state.element) {
                const deltaX = touch.clientX - state.startX;
                const deltaY = touch.clientY - state.startY;
                state.element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;
            }
        }
    }

    /**
     * Handle touch end event
     */
    onTouchEnd(event: TouchEvent): void {
        const state = this.touchState();
        if (!state) return;

        // Clear hold timer
        if (state.holdTimer) {
            clearTimeout(state.holdTimer);
        }

        // Reset visual state
        if (state.element) {
            state.element.style.transform = '';
            state.element.style.boxShadow = '';
        }

        // If dragging, handle drop
        if (state.isDragging) {
            const touch = event.changedTouches[0];
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);

            if (dropTarget) {
                // Check if dropped on target area
                const targetArea = dropTarget.closest('[data-drop-zone="target"]');
                const availableArea = dropTarget.closest('[data-drop-zone="available"]');

                if (targetArea) {
                    // Simulate drop to target
                    const dropEvent = new DragEvent('drop');
                    this.onDropToTarget(dropEvent);
                } else if (availableArea && state.from === 'target') {
                    // Simulate drop to available
                    const dropEvent = new DragEvent('drop');
                    this.onDropToAvailable(dropEvent);
                }
            }
        }

        // Clear touch state
        this.touchState.set(null);
    }
}

