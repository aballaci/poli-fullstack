import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, input, NgZone, OnDestroy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { SessionStore } from '../../state/session.store';
import { GeminiService } from '../../services/gemini.service';
import { Language, Sentence, SentencePart, SpeechAssessment } from '../../models';

type PracticeStep = 'initial' | 'prompting' | 'result';
type RecordingState = 'idle' | 'countdown' | 'listening' | 'processing';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

@Component({
  selector: 'app-practice-view',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './practice-view.component.html',
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.5s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse-and-fade {
      0% {
        transform: scale(0.5);
        opacity: 0.5;
      }
      50% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }
    .animate-pulse-and-fade {
      animation: pulse-and-fade 1s ease-out;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeViewComponent implements OnDestroy {
  // Inputs/Outputs
  sentence = input.required<Sentence>();
  sourceLang = input.required<Language>();
  targetLang = input.required<Language>();
  currentSentenceIndex = input.required<number>();
  totalSentences = input.required<number>();
  nextSentence = output<void>();

  goToNextSentence(): void {
    console.log('[PracticeView] goToNextSentence called');
    console.log('[PracticeView] Current sentence index:', this.currentSentenceIndex());
    console.log('[PracticeView] Total sentences:', this.totalSentences());
    console.log('[PracticeView] Is last sentence:', this.isLastSentence());
    this.nextSentence.emit();
    console.log('[PracticeView] nextSentence.emit() called');
  }

  // Injected services
  store = inject(SessionStore);
  gemini = inject(GeminiService);
  cdr = inject(ChangeDetectorRef);
  zone = inject(NgZone);

  // Component State
  practiceStep = signal<PracticeStep>('initial');
  recordingState = signal<RecordingState>('idle');
  isPeeking = signal(false);
  error = signal<string | null>(null);

  // Speech Recognition State
  private recognition: any | null = null;
  isSpeechRecognitionSupported = false;
  userTranscript = signal('');

  // Assessment State
  currentAssessment = signal<SpeechAssessment | null>(null);

  // Computed signal to help with template detection
  readonly hasAssessment = computed(() => {
    const assessment = this.currentAssessment();
    console.log('[PracticeView] hasAssessment computed, assessment:', assessment);
    return assessment !== null;
  });

  // Countdown State
  countdownValue = signal<number | null>(null);
  private countdownInterval: any;

  // Derived State from Store/Inputs
  readonly practiceMode = this.store.practiceMode;
  readonly useAI = this.store.useAIComparison;
  readonly flow = this.store.flowDirection;

  readonly isLastSentence = computed(() => this.currentSentenceIndex() === this.totalSentences() - 1);

  readonly progress = computed(() => {
    const total = this.totalSentences();
    if (total === 0) return 0;
    return ((this.currentSentenceIndex() + 1) / total) * 100;
  });

  readonly prompt = computed<{ part: SentencePart, lang: Language }>(() => {
    const s = this.sentence();
    return this.flow() === 'source-to-target'
      ? { part: s.source, lang: this.sourceLang() }
      : { part: s.target, lang: this.targetLang() };
  });

  readonly challenge = computed<{ part: SentencePart, lang: Language }>(() => {
    const s = this.sentence();
    return this.flow() === 'source-to-target'
      ? { part: s.target, lang: this.targetLang() }
      : { part: s.source, lang: this.sourceLang() };
  });

  readonly isChallengeVisible = computed(() => {
    // Show challenge during initial, result, and countdown steps
    if (this.practiceStep() === 'initial' || this.practiceStep() === 'result' || this.recordingState() === 'countdown') {
      return true;
    }
    // During prompting, only show if in practice mode and peeking
    return this.practiceMode() === 'practice' && this.isPeeking();
  });

  readonly isSuccessfulAttempt = computed(() => {
    const assessment = this.currentAssessment();
    if (!assessment) {
      return false;
    }
    return assessment.pronunciation_score >= 70;
  });

  readonly canStartPractice = computed(() => {
    return this.recordingState() === 'idle' && this.practiceStep() === 'initial';
  });

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.isSpeechRecognitionSupported = true;
      }
    }

    // Reset component state when the input sentence changes
    effect(() => {
      this.sentence(); // dependency
      this.resetForNewSentence();
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  startPracticeAttempt(): void {
    console.log('[PracticeView] startPracticeAttempt called');
    console.log('[PracticeView] Current state - recordingState:', this.recordingState(), 'practiceStep:', this.practiceStep());
    console.log('[PracticeView] canStartPractice:', this.canStartPractice());

    if (!this.canStartPractice()) {
      console.warn('[PracticeView] Cannot start - recordingState:', this.recordingState(), 'practiceStep:', this.practiceStep(), 'canStartPractice:', this.canStartPractice());
      return;
    }

    console.log('[PracticeView] Starting practice attempt');
    this.recordingState.set('countdown');
    this.countdownValue.set(3);

    this.countdownInterval = setInterval(() => {
      this.countdownValue.update(val => {
        const newValue = (val ?? 1) - 1;
        if (newValue > 0) {
          return newValue;
        } else {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
          this.practiceStep.set('prompting');
          this.startRecognition();
          return null;
        }
      });
    }, 1000);
  }

  stopRecording(): void {
    if (this.recordingState() === 'listening' && this.recognition) {
      this.recognition.stop();
    }
  }

  peek(): void {
    if (this.practiceMode() !== 'practice' || this.practiceStep() !== 'prompting') return;
    this.isPeeking.set(true);
    setTimeout(() => this.isPeeking.set(false), 2000); // Show for 2 seconds
  }

  private startRecognition(): void {
    if (!this.isSpeechRecognitionSupported) {
      this.error.set('Speech recognition is not supported by your browser.');
      return;
    }

    this.resetAttemptState();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.lang = this.challenge().lang.code;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      this.recordingState.set('processing');
      const transcript = event.results[0][0].transcript;
      this.userTranscript.set(transcript);
      this.processSpeech();
    };

    this.recognition.onerror = (event: any) => this.handleRecognitionError(event.error);
    this.recognition.onend = () => {
      // If still listening when onend fires (pause detection), transition to processing
      // If already processing, the state will be reset after assessment completes
      if (this.recordingState() === 'listening') {
        // If we have a result, it will be processed. If not, reset to idle
        if (!this.userTranscript()) {
          this.recordingState.set('idle');
        }
        // Otherwise, state will remain 'processing' until processSpeech completes
      }
      this.recognition = null;
    };

    try {
      this.recordingState.set('listening');
      this.recognition.start();
    } catch (e) {
      console.error('[SpeechRecognition] Error starting:', e);
      this.handleRecognitionError('audio-capture');
    }
  }

  private handleRecognitionError(errorType: string): void {
    let message = 'An unknown speech recognition error occurred.';
    if (errorType === 'no-speech') message = "We didn't hear anything. Please try speaking again.";
    else if (errorType === 'audio-capture') message = 'There was a problem with your microphone. Please check permissions.';
    else if (errorType === 'not-allowed') message = 'Microphone access was denied. Please allow it in your browser settings.';
    this.error.set(message);
    this.recordingState.set('idle');
    this.recognition = null;
  }

  private async processSpeech(): Promise<void> {
    this.practiceStep.set('result');
    const transcript = this.userTranscript();
    const sentence = this.sentence();

    if (this.useAI()) {
      try {
        console.log('[PracticeView] Fetching assessment...');
        const assessment = await this.gemini.assessPronunciation(this.challenge().part.text, transcript, this.challenge().lang);
        console.log('[PracticeView] Assessment received:', assessment);
        console.log('[PracticeView] Assessment type:', typeof assessment);
        console.log('[PracticeView] Assessment keys:', Object.keys(assessment || {}));

        // Validate assessment structure
        if (!assessment || typeof assessment !== 'object') {
          throw new Error('Invalid assessment received from server');
        }

        if (typeof assessment.pronunciation_score !== 'number' || typeof assessment.fluency_score !== 'number') {
          console.error('[PracticeView] Invalid assessment scores:', assessment);
          throw new Error('Assessment missing required scores');
        }

        // Set assessment signal - this should trigger change detection automatically
        this.currentAssessment.set(assessment);
        console.log('[PracticeView] Assessment signal set, current value:', this.currentAssessment());
        console.log('[PracticeView] Assessment pronunciation_score:', this.currentAssessment()?.pronunciation_score);
        console.log('[PracticeView] Assessment fluency_score:', this.currentAssessment()?.fluency_score);

        this.store.addSentenceResult(sentence, assessment, transcript);
        this.playResultSound(assessment.pronunciation_score >= 70);

        // Reset recording state after assessment is complete
        this.recordingState.set('idle');
        console.log('[PracticeView] Recording state set to idle, current:', this.recordingState());

        // Use setTimeout to ensure change detection happens after signal updates
        setTimeout(() => {
          this.cdr.detectChanges();
          console.log('[PracticeView] Change detection triggered after timeout');
        }, 0);
      } catch (e: any) {
        console.error('Error assessing pronunciation', e);
        this.error.set(e.message || 'Failed to get feedback from the AI.');
        this.store.addSentenceResult(sentence, null, transcript);
        this.playResultSound(false);
        // Reset recording state even on error
        this.recordingState.set('idle');
        // Force immediate change detection to ensure UI updates
        this.cdr.detectChanges();
      }
    } else {
      // AI is off, create a mock assessment based on string similarity.
      const original = this.challenge().part.text;
      const similarity = this.calculateStringSimilarity(original, transcript);

      const mockAssessment: SpeechAssessment = {
        pronunciation_score: similarity,
        fluency_score: similarity, // Use similarity for both as fluency can't be measured
        overall_feedback: similarity >= 70 ? 'Good job! The text matches well.' : 'Keep practicing, there are some differences in the text.',
        suggestions: []
      };

      this.currentAssessment.set(mockAssessment);
      this.store.addSentenceResult(sentence, mockAssessment, transcript);
      this.playResultSound(similarity >= 70);
      // Reset recording state after assessment is complete
      this.recordingState.set('idle');
      // Force immediate change detection to ensure UI updates
      this.cdr.detectChanges();
    }
  }

  retry(): void {
    console.log('[PracticeView] Retry button clicked');
    console.log('[PracticeView] Before reset - practiceStep:', this.practiceStep(), 'recordingState:', this.recordingState());

    // Reset state
    this.resetForNewSentence();

    console.log('[PracticeView] After reset - practiceStep:', this.practiceStep(), 'recordingState:', this.recordingState());

    // Ensure change detection runs in Angular zone
    this.zone.run(() => {
      // Force change detection to ensure UI updates immediately
      this.cdr.detectChanges();

      // Use setTimeout to ensure change detection happens after all signal updates
      setTimeout(() => {
        this.cdr.detectChanges();
        console.log('[PracticeView] Change detection triggered after timeout');
      }, 0);
    });
  }

  private resetForNewSentence(): void {
    // Clear any ongoing countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    // Stop any active recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors if already stopped
        console.log('[PracticeView] Error stopping recognition (ignored):', e);
      }
      this.recognition = null;
    }

    // Reset all state signals in correct order
    this.recordingState.set('idle');
    this.countdownValue.set(null);
    this.userTranscript.set('');
    this.currentAssessment.set(null);
    this.error.set(null);
    this.isPeeking.set(false);
    // Set practiceStep last to ensure other states are reset first
    this.practiceStep.set('initial');
  }

  private resetAttemptState(): void {
    this.recordingState.set('idle');
    this.userTranscript.set('');
    this.currentAssessment.set(null);
    this.error.set(null);
  }

  private playResultSound(isSuccess: boolean): void {
    const fileName = isSuccess ? 'chime-success.mp3' : 'chime-failure.mp3';
    const baseUrl = this.store.s3BaseUrl();
    if (!baseUrl || typeof window === 'undefined') return;
    const audio = new Audio(`${baseUrl}${fileName}`);
    audio.play().catch(e => console.error(`[Audio] Failed to play ${fileName}`, e));
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(newValue, lastValue, costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }
    const distance = costs[s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 100;

    const similarity = (1 - distance / maxLength) * 100;
    return Math.round(similarity);
  }

  getScoreColor(score: number): string {
    if (score >= 85) return 'text-emerald-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  }

  getScoreRingColor(score: number): string {
    if (score >= 85) return 'stroke-emerald-500';
    if (score >= 60) return 'stroke-yellow-500';
    return 'stroke-red-500';
  }
}
