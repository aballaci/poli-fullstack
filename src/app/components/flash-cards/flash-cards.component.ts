import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighlightedWord } from '../../models';

@Component({
  selector: 'app-flash-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flash-cards.component.html',
  styles: [`
    /* Flashcard animation styles */
    .flashcard-container {
      perspective: 1000px;
    }
    .flashcard {
      transform-style: preserve-3d;
      transition: transform 0.6s;
      cursor: pointer;
    }

    /* Different flip animations triggered by parent class */
    .flip-y .flashcard.is-flipped { transform: rotateY(180deg); }
    .flip-x .flashcard.is-flipped { transform: rotateX(180deg); }
    .flip-diag .flashcard.is-flipped { transform: rotate3d(1, 1, 0, 180deg); }


    .flashcard-face {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden; /* Safari */
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /* Backface needs to be pre-rotated based on parent animation class */
    .flip-y .flashcard-back { transform: rotateY(180deg); }
    .flip-x .flashcard-back { transform: rotateX(180deg); }
    .flip-diag .flashcard-back { transform: rotate3d(1, 1, 0, 180deg); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashCardsComponent {
  flashcards = input.required<HighlightedWord[]>();

  activeFlashcardIndex = signal(0);
  isCardFlipped = signal(false);

  // New animation logic
  private readonly flipAnimations = ['flip-y', 'flip-x', 'flip-diag'];
  currentAnimation = signal(this.flipAnimations[0]);

  currentFlashcard = computed(() => {
    const cards = this.flashcards();
    if (cards.length === 0) return null;
    return cards[this.activeFlashcardIndex()];
  });

  isFirstCard = computed(() => this.activeFlashcardIndex() === 0);
  isLastCard = computed(() => {
    const cards = this.flashcards();
    if (cards.length === 0) return true;
    return this.activeFlashcardIndex() === cards.length - 1;
  });

  private setRandomAnimation(): void {
    const randomIndex = Math.floor(Math.random() * this.flipAnimations.length);
    this.currentAnimation.set(this.flipAnimations[randomIndex]);
  }

  flipCard(): void {
    this.isCardFlipped.update(v => !v);
  }

  goToNextCard(): void {
    if (!this.isLastCard()) {
      this.activeFlashcardIndex.update(i => i + 1);
      this.isCardFlipped.set(false);
      this.setRandomAnimation();
    }
  }

  goToPreviousCard(): void {
    if (!this.isFirstCard()) {
      this.activeFlashcardIndex.update(i => i - 1);
      this.isCardFlipped.set(false);
      this.setRandomAnimation();
    }
  }
}