import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ExerciseService } from '../../../services/exercise.service';
import { SessionStore } from '../../../state/session.store';
import { ThemeService } from '../../../services/theme.service';
import { SoundService } from '../../../services/sound.service';
import { FillInBlankExercise, FillInBlankExercises } from '../../../models/exercise.models';

@Component({
    selector: 'app-fill-in-blank-exercise',
    standalone: true,
    imports: [CommonModule, TranslocoModule],
    templateUrl: './fill-in-blank-exercise.component.html',
})
export class FillInBlankExerciseComponent implements OnInit {
    private exerciseService = inject(ExerciseService);
    private sessionStore = inject(SessionStore);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    readonly themeService = inject(ThemeService);
    private soundService = inject(SoundService);

    // Exercise data
    readonly exercises = signal<FillInBlankExercise[]>([]);
    readonly currentIndex = signal<number>(0);
    readonly selectedOption = signal<string | null>(null);
    readonly showAnswer = signal<boolean>(false);
    readonly isLoading = signal<boolean>(true);
    readonly errorMessage = signal<string | null>(null);

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

    /**
     * Format the sentence with a stylish dashed line for the blank
     * Returns an array of objects with text and optional punctuation
     */
    readonly formattedSentence = computed(() => {
        const exercise = this.currentExercise();
        if (!exercise) return [];

        // Split the sentence by ___ to get parts before and after the blank
        const parts = exercise.sentenceWithBlank.split('___');

        // Process each part to extract trailing punctuation from the second part
        const result = parts.map((part, index) => {
            if (index === parts.length - 1) {
                // Last part - check for leading punctuation
                const match = part.match(/^([.,!?;:]+)(.*)$/);
                if (match) {
                    return {
                        text: match[2].trim(),
                        punctuation: match[1]
                    };
                }
            }
            return {
                text: part.trim(),
                punctuation: ''
            };
        });

        return result;
    });

    ngOnInit(): void {
        this.loadExercises();
    }

    /**
     * Load fill-in-blank exercises from the service
     */
    private loadExercises(): void {
        const currentScenarioId = this.scenarioId();

        if (!currentScenarioId) {
            this.errorMessage.set('No active scenario found');
            this.isLoading.set(false);
            return;
        }

        this.exerciseService.getExercise(currentScenarioId, 'fillInBlank').subscribe({
            next: (data) => {
                if (data && 'exercises' in data) {
                    const fillInBlankData = data as FillInBlankExercises;
                    this.exercises.set(fillInBlankData.exercises);
                    this.isLoading.set(false);
                } else {
                    this.errorMessage.set('No fill-in-blank exercises available for this scenario');
                    this.isLoading.set(false);
                }
            },
            error: (error) => {
                console.error('Error loading fill-in-blank exercises:', error);
                this.errorMessage.set('Failed to load exercises. Please try again.');
                this.isLoading.set(false);
            }
        });
    }

    /**
     * Handle option selection - automatically validates the answer
     */
    selectOption(option: string): void {
        if (this.showAnswer()) {
            return; // Don't allow selection after answer is revealed
        }
        this.selectedOption.set(option);
        // Automatically show the answer when an option is selected
        this.showAnswer.set(true);

        // Play sound based on correctness
        const exercise = this.currentExercise();
        if (exercise) {
            const isCorrect = option === exercise.correctAnswer;
            if (isCorrect) {
                this.soundService.playSuccess();
            } else {
                this.soundService.playFailure();
            }
        }
    }

    /**
     * Navigate to the next exercise
     */
    nextExercise(): void {
        if (!this.isLastExercise()) {
            this.currentIndex.update(index => index + 1);
            this.selectedOption.set(null);
            this.showAnswer.set(false);
        }
    }

    /**
     * Finish the exercise and mark as completed
     */
    finish(): void {
        this.exerciseService.markExerciseCompleted('fillInBlank');
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
     * Check if the selected option is correct
     */
    isCorrectAnswer(option: string): boolean {
        const current = this.currentExercise();
        return current ? option === current.correctAnswer : false;
    }

    /**
     * Check if the selected option is incorrect
     */
    isIncorrectAnswer(option: string): boolean {
        const current = this.currentExercise();
        const selected = this.selectedOption();
        return this.showAnswer() && selected === option && option !== current?.correctAnswer;
    }

    /**
     * Handle keyboard navigation
     */
    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        const current = this.currentExercise();
        if (!current) return;

        // Escape key - go back
        if (event.key === 'Escape') {
            this.goBack();
            return;
        }

        // If answer is shown, handle next/finish
        if (this.showAnswer()) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (this.isLastExercise()) {
                    this.finish();
                } else {
                    this.nextExercise();
                }
            }
            return;
        }

        // Number keys 1-4 to select options (automatically validates)
        const numKey = parseInt(event.key);
        if (numKey >= 1 && numKey <= 4 && numKey <= current.options.length) {
            event.preventDefault();
            this.selectOption(current.options[numKey - 1]);
        }
    }
}
