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
    Reading: 'text-cyan-500', // --color-cyan: #22D3EE;
    Vocabulary: 'text-amber-500', // --color-amber: #F59E0B;
    Exercises: 'text-coral-500', // --color-coral: #FF6B6B;
    Flashcards: 'text-lilac-500', // --color-lilac: #A78BFA;
    Practice: 'text-emerald-500', // --color-emerald: #10B981;
    Challenge: 'text-indigo-500', // --color-indigo: #6C5CE7;
    Summary: 'text-primary-500', // --color-primary: #2F80ED;
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
