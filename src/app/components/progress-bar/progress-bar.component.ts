import { Component, Input } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ConversationStep, conversationSteps } from '../conversation-view/conversation-view.component';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './progress-bar.component.html',
})
export class ProgressBarComponent {
  @Input() currentStep: ConversationStep = 'Reading';
  steps = conversationSteps;

  // --color-primary: #2F80ED; (used for active)
  // --color-emerald: #10B981; (used for completed)
  stepColors: Record<ConversationStep, string> = {
    // Use slightly stronger shades on light and lighter on dark for contrast
    Reading: 'text-cyan-600 dark:text-cyan-300',
    Vocabulary: 'text-amber-600 dark:text-amber-300',
    // Tailwind doesn't include custom coral/lilac scales; approximate with rose/violet in dark mode
    Exercises: 'text-coral-500 dark:text-rose-300',
    Flashcards: 'text-lilac-500 dark:text-violet-300',
    Practice: 'text-emerald-600 dark:text-emerald-300',
    Challenge: 'text-indigo-600 dark:text-indigo-300',
    Summary: 'text-primary-500',
  };

  isActive(index: number): boolean {
    return this.steps[index] === this.currentStep;
  }

  isCompleted(index: number): boolean {
    return this.steps.indexOf(this.currentStep) > index;
  }

  isUpcoming(index: number): boolean {
    return this.steps.indexOf(this.currentStep) < index;
  }

  getColor(step: ConversationStep): string {
    return this.stepColors[step];
  }

  getIcon(step: ConversationStep): string {
    switch (step) {
      case 'Reading': return 'fa-solid fa-book-open-reader';
      case 'Vocabulary': return 'fa-solid fa-spell-check';
      case 'Exercises': return 'fa-solid fa-pencil-alt';
      case 'Flashcards': return 'fa-solid fa-clone';
      case 'Practice': return 'fa-solid fa-eye';
      case 'Challenge': return 'fa-solid fa-brain';
      case 'Summary': return 'fa-solid fa-chart-pie';
      default: return '';
    }
  }
}
