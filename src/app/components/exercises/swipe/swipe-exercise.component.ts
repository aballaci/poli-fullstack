import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExerciseService } from '../../../services/exercise.service';
import { SessionStore } from '../../../state/session.store';
import { SwipeCard, SwipeExercise } from '../../../models/exercise.models';

@Component({
    selector: 'app-swipe-exercise',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './swipe-exercise.component.html',
})
export class SwipeExerciseComponent implements OnInit {
    private exerciseService = inject(ExerciseService);
    private sessionStore = inject(SessionStore);
    private router = inject(Router);

    // Exercise data
    readonly cards = signal<SwipeCard[]>([]);
    readonly currentCardIndex = signal<number>(0);
    readonly userAnswers = signal<boolean[]>([]);
    readonly showSummary = signal<boolean>(false);
    readonly isLoading = signal<boolean>(true);
    readonly errorMessage = signal<string | null>(null);

    // Swipe state
    readonly cardTransform = signal<string>('translate(0, 0) rotate(0deg)');
    readonly showFeedback = signal<boolean>(false);
    readonly feedbackCorrect = signal<boolean>(false);
    private touchStartX = 0;
    private touchStartY = 0;
    private readonly swipeThreshold = 100;

    // Computed properties
    readonly currentCard = computed(() => {
        const cards = this.cards();
        const index = this.currentCardIndex();
        return cards[index] || null;
    });

    readonly totalCards = computed(() => this.cards().length);

    readonly correctCount = computed(() => {
        return this.userAnswers().filter(answer => answer).length;
    });

    readonly scenarioId = computed(() => this.sessionStore.activeScenario()?.id);

    ngOnInit(): void {
        this.loadExercise();
    }

    /**
     * Load swipe exercise from the service
     */
    private loadExercise(): void {
        const currentScenarioId = this.scenarioId();

        if (!currentScenarioId) {
            this.errorMessage.set('No active scenario found');
            this.isLoading.set(false);
            return;
        }

        this.exerciseService.getExercise(currentScenarioId, 'swipe').subscribe({
            next: (data) => {
                if (data && 'cards' in data) {
                    const swipeData = data as SwipeExercise;
                    this.cards.set(swipeData.cards);
                    this.isLoading.set(false);
                } else {
                    this.errorMessage.set('No swipe exercise available for this scenario');
                    this.isLoading.set(false);
                }
            },
            error: (error) => {
                console.error('Error loading swipe exercise:', error);
                this.errorMessage.set('Failed to load exercise. Please try again.');
                this.isLoading.set(false);
            }
        });
    }

    /**
     * Handle touch start event
     */
    onTouchStart(event: TouchEvent): void {
        if (this.showSummary()) return;
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    /**
     * Handle touch move event
     */
    onTouchMove(event: TouchEvent): void {
        if (this.showSummary()) return;
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const rotation = deltaX / 20;

        this.cardTransform.set(`translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`);
    }

    /**
     * Handle touch end event
     */
    onTouchEnd(event: TouchEvent): void {
        if (this.showSummary()) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - this.touchStartX;

        if (Math.abs(deltaX) > this.swipeThreshold) {
            if (deltaX > 0) {
                this.swipeRight();
            } else {
                this.swipeLeft();
            }
        } else {
            // Reset card position
            this.cardTransform.set('translate(0, 0) rotate(0deg)');
        }
    }

    /**
     * Swipe right (correct)
     */
    swipeRight(): void {
        if (this.showSummary()) return;
        const card = this.currentCard();
        if (!card) return;

        const isCorrect = card.isCorrect;
        this.recordAnswer(isCorrect);
        this.showFeedbackAnimation(isCorrect);
        this.advanceToNextCard();
    }

    /**
     * Swipe left (incorrect)
     */
    swipeLeft(): void {
        if (this.showSummary()) return;
        const card = this.currentCard();
        if (!card) return;

        const isCorrect = !card.isCorrect;
        this.recordAnswer(isCorrect);
        this.showFeedbackAnimation(isCorrect);
        this.advanceToNextCard();
    }

    /**
     * Record user answer
     */
    private recordAnswer(isCorrect: boolean): void {
        this.userAnswers.update(answers => [...answers, isCorrect]);
    }

    /**
     * Show feedback animation
     */
    private showFeedbackAnimation(isCorrect: boolean): void {
        this.feedbackCorrect.set(isCorrect);
        this.showFeedback.set(true);

        setTimeout(() => {
            this.showFeedback.set(false);
        }, 500);
    }

    /**
     * Advance to next card or show summary
     */
    private advanceToNextCard(): void {
        setTimeout(() => {
            this.cardTransform.set('translate(0, 0) rotate(0deg)');

            if (this.currentCardIndex() < this.totalCards() - 1) {
                this.currentCardIndex.update(index => index + 1);
            } else {
                this.showSummary.set(true);
            }
        }, 600);
    }

    /**
     * Finish the exercise and mark as completed
     */
    finish(): void {
        this.exerciseService.markExerciseCompleted('swipe');
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

