import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionStore } from '../../state/session.store';
import { ExerciseService } from '../../services/exercise.service';
import { ReadingModeComponent } from '../reading-mode/reading-mode.component';
import { SummaryViewComponent } from '../summary-view/summary-view.component';
import { FlashCardsComponent } from '../flash-cards/flash-cards.component';
import { PracticeViewComponent } from '../practice-view/practice-view.component';
import { VocabularyComponent } from '../vocabulary/vocabulary.component';
import { ExercisesComponent } from '../exercises/exercises.component';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

export const conversationSteps = [
  'Reading',
  'Vocabulary',
  'Exercises',
  'Flashcards',
  'Practice',
  'Challenge',
  'Summary',
] as const;
export type ConversationStep = (typeof conversationSteps)[number];

@Component({
  selector: 'app-conversation-view',
  standalone: true,
  imports: [
    CommonModule,
    ReadingModeComponent,
    SummaryViewComponent,
    FlashCardsComponent,
    PracticeViewComponent,
    VocabularyComponent,
    ExercisesComponent,
    ProgressBarComponent,
  ],
  templateUrl: './conversation-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationViewComponent implements OnDestroy {
  store = inject(SessionStore);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  exerciseService = inject(ExerciseService);

  // Component state
  steps = conversationSteps;
  currentStep = signal<ConversationStep>('Reading');

  // Keep practiceMode in sync for now, might refactor later
  readonly practiceMode = computed(() => {
    const step = this.currentStep();
    if (step === 'Practice' || step === 'Challenge') {
      return step.toLowerCase() as 'practice' | 'challenge';
    }
    return 'practice'; // Default
  });

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
      this.currentSentenceIndex.update(i => i + 1);
      this.cdr.detectChanges();
    } else {
      // Both 'Practice' and 'Challenge' modes advance to the next step.
      // The specific next step is determined by the `steps` array.
      this.goToNextStep();
    }
  }

  startNewSession(): void {
    this.store.resetConversation();
    this.exerciseService.resetCompletionState();
    this.router.navigate(['/selector']);
  }

  goToNextStep(): void {
    const currentIdx = this.steps.indexOf(this.currentStep());
    if (currentIdx < this.steps.length - 1) {
      this.currentStep.set(this.steps[currentIdx + 1]);
    }
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
    this.currentStep.set('Practice');
  }

  startChallengeMode(): void {
    this.store.resetConversationHistory();
    this.currentSentenceIndex.set(0);
    this.currentStep.set('Challenge');
  }

  viewSummary(): void {
    this.currentStep.set('Summary');
  }

  navigateToStep(step: ConversationStep): void {
    this.currentStep.set(step);
  }
}