import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionStore } from '../../state/session.store';
import { GeminiService } from '../../services/gemini.service';
import { ReadingModeComponent } from '../reading-mode/reading-mode.component';
import { SummaryViewComponent } from '../summary-view/summary-view.component';
import { FlashCardsComponent } from '../flash-cards/flash-cards.component';
import { PracticeViewComponent } from '../practice-view/practice-view.component';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

type ConversationViewMode = 'reading' | 'practice' | 'summary' | 'flashcards' | 'completed';

export interface Step {
  label: string;
  state: 'not_started' | 'started' | 'completed' | 'skipped';
  icon: string;
}

@Component({
  selector: 'app-conversation-view',
  standalone: true,
  imports: [CommonModule, ReadingModeComponent, SummaryViewComponent, FlashCardsComponent, PracticeViewComponent, ProgressBarComponent],
  templateUrl: './conversation-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationViewComponent implements OnDestroy {
  store = inject(SessionStore);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  // Component state
  mode = signal<ConversationViewMode>('reading');
  steps = signal<Step[]>([
    { label: 'Reading', state: 'started', icon: 'fa-solid fa-book-open-reader' },
    { label: 'Practice', state: 'not_started', icon: 'fa-solid fa-eye' },
    { label: 'Challenge', state: 'not_started', icon: 'fa-solid fa-brain' },
    { label: 'Flashcards', state: 'not_started', icon: 'fa-solid fa-clone' },
    { label: 'Summary', state: 'not_started', icon: 'fa-solid fa-chart-pie' }
  ]);
  
  // Practice Mode state
  readonly practiceMode = this.store.practiceMode;

  // Conversation state
  scenario = this.store.activeScenario;
  sourceLang = this.store.sourceLanguage;
  targetLang = this.store.targetLanguage;
  currentSentenceIndex = signal(0);
  currentSentence = computed(() => this.scenario()?.sentences[this.currentSentenceIndex()]);
  
  // Derived state for template
  isFirstSentence = computed(() => this.currentSentenceIndex() === 0);
  isLastSentence = computed(() => this.currentSentenceIndex() === (this.scenario()?.sentences.length ?? 0) - 1);
  flashcards = this.store.allHighlightedWords;

  // Practice settings state
  readonly useAI = this.store.useAIComparison;
  readonly flowDirection = this.store.flowDirection;

  constructor() {
    if (this.scenario() === null) {
      this.router.navigate(['/selector']);
      return;
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
  }
  
  previousSentence(): void {
    if (!this.isFirstSentence()) {
        this.currentSentenceIndex.update(i => i - 1);
    }
  }

  nextSentence(): void {
    console.log('[ConversationView] nextSentence called');
    console.log('[ConversationView] Current index:', this.currentSentenceIndex());
    console.log('[ConversationView] Is last sentence:', this.isLastSentence());
    console.log('[ConversationView] Practice mode:', this.practiceMode());
    
    if (!this.isLastSentence()) {
        console.log('[ConversationView] Moving to next sentence');
        this.currentSentenceIndex.update(i => i + 1);
        // Force change detection to ensure UI updates
        this.cdr.detectChanges();
    } else {
        console.log('[ConversationView] Last sentence reached');
        // In challenge mode, go directly to the summary.
        // In practice mode, show the completion screen.
        if (this.practiceMode() === 'challenge') {
            console.log('[ConversationView] Setting mode to summary');
            this.setMode('summary');
        } else {
            console.log('[ConversationView] Setting mode to completed');
            this.setMode('completed');
        }
    }
  }

  startNewSession(): void {
    this.store.resetConversation();
    this.steps.set([
      { label: 'Reading', state: 'started', icon: 'fa-solid fa-book-open-reader' },
      { label: 'Practice', state: 'not_started', icon: 'fa-solid fa-eye' },
      { label: 'Challenge', state: 'not_started', icon: 'fa-solid fa-brain' },
      { label: 'Flashcards', state: 'not_started', icon: 'fa-solid fa-clone' },
      { label: 'Summary', state: 'not_started', icon: 'fa-solid fa-chart-pie' }
    ]);
    this.router.navigate(['/selector']);
  }

  private clearSummaryIfLeaving(): void {
    if (this.mode() === 'summary') {
      this.store.resetConversationHistory();
    }
  }

  updateStepState(label: string, newState: 'not_started' | 'started' | 'completed' | 'skipped'): void {
    this.steps.update(steps =>
      steps.map(step =>
        step.label === label ? { ...step, state: newState } : step
      )
    );
  }

  setMode(newMode: ConversationViewMode): void {
    this.clearSummaryIfLeaving();

    const currentMode = this.mode();
    if (currentMode === newMode) return;

    this.steps.update(steps => {
      return steps.map(step => {
        const stepLabelLower = step.label.toLowerCase();

        // Mark the old step as completed if it was started
        if (stepLabelLower === currentMode && step.state === 'started') {
          return { ...step, state: 'completed' };
        }

        // Mark the new step as started
        if (stepLabelLower === newMode) {
          return { ...step, state: 'started' };
        }

        return step;
      });
    });

    this.mode.set(newMode);
  }

  setPracticeMode(newPracticeMode: 'practice' | 'challenge'): void {
    if (this.practiceMode() !== newPracticeMode) {
      this.store.resetConversationHistory();
      this.currentSentenceIndex.set(0);
    }

    this.clearSummaryIfLeaving();
    this.store.setPracticeMode(newPracticeMode);

    const practiceStepLabel = newPracticeMode === 'practice' ? 'Practice' : 'Challenge';

    this.steps.update(steps => {
      return steps.map(step => {
        // Mark any currently started step as completed
        if (step.state === 'started') {
          return { ...step, state: 'completed' };
        }
        // Mark the selected practice mode as started
        if (step.label === practiceStepLabel) {
          return { ...step, state: 'started' };
        }
        return step;
      });
    });

    this.mode.set('practice');
  }

  toggleAiEvaluation(): void {
    this.store.setUseAIComparison(!this.useAI());
  }

  toggleFlowDirection(): void {
    this.store.toggleFlowDirection();
  }

  // --- Methods for the 'completed' view ---

  repeatSession(): void {
    this.store.resetConversationHistory();
    this.currentSentenceIndex.set(0);
    this.setMode('practice'); // Stays in the current practice/challenge mode
  }

  startChallengeMode(): void {
    this.store.setPracticeMode('challenge');
    this.store.resetConversationHistory();
    this.currentSentenceIndex.set(0);
    this.setMode('practice');
  }

  viewSummary(): void {
    this.setMode('summary');
  }

  skipStep(): void {
    const currentStep = this.steps().find(step => step.state === 'started');
    if (currentStep) {
      this.steps.update(steps => {
        return steps.map(step => {
          if (step.label === currentStep.label) {
            return { ...step, state: 'skipped', icon: 'fa-solid fa-forward' };
          }
          return step;
        });
      });

      const currentIndex = this.steps().findIndex(step => step.label === currentStep.label);
      const nextStep = this.steps()[currentIndex + 1];

      if (nextStep) {
        this.setMode(nextStep.label.toLowerCase() as ConversationViewMode);
      }
    }
  }
}