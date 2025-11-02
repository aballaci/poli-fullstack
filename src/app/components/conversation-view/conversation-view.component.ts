import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionStore } from '../../state/session.store';
import { GeminiService } from '../../services/gemini.service';
import { ReadingModeComponent } from '../reading-mode/reading-mode.component';
import { SummaryViewComponent } from '../summary-view/summary-view.component';
import { FlashCardsComponent } from '../flash-cards/flash-cards.component';
import { PracticeViewComponent } from '../practice-view/practice-view.component';

type ConversationViewMode = 'reading' | 'practice' | 'summary' | 'flashcards' | 'completed';

@Component({
  selector: 'app-conversation-view',
  standalone: true,
  imports: [CommonModule, ReadingModeComponent, SummaryViewComponent, FlashCardsComponent, PracticeViewComponent],
  templateUrl: './conversation-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationViewComponent implements OnDestroy {
  store = inject(SessionStore);
  router = inject(Router);

  // Component state
  mode = signal<ConversationViewMode>('reading');
  
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
    if (!this.isLastSentence()) {
        this.currentSentenceIndex.update(i => i + 1);
    } else {
        // In challenge mode, go directly to the summary.
        // In practice mode, show the completion screen.
        if (this.practiceMode() === 'challenge') {
            this.setMode('summary');
        } else {
            this.setMode('completed');
        }
    }
  }

  startNewSession(): void {
    this.store.resetConversation();
    this.router.navigate(['/selector']);
  }

  private clearSummaryIfLeaving(): void {
    if (this.mode() === 'summary') {
      this.store.resetConversationHistory();
    }
  }

  setMode(newMode: ConversationViewMode): void {
    this.clearSummaryIfLeaving();
    this.mode.set(newMode);
  }

  setPracticeMode(newPracticeMode: 'practice' | 'challenge'): void {
    // If switching between 'practice' and 'challenge', reset the session progress.
    if (this.practiceMode() !== newPracticeMode) {
      this.store.resetConversationHistory();
      this.currentSentenceIndex.set(0);
    }
    
    this.clearSummaryIfLeaving();
    this.store.setPracticeMode(newPracticeMode);
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
}