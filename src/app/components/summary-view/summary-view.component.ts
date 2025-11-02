import { ChangeDetectionStrategy, Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStore } from '../../state/session.store';

@Component({
  selector: 'app-summary-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-fade-in">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-[var(--c-text-headings)]">Practice Summary</h2>
      </div>

      <!-- Overall Scores -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div class="bg-[var(--c-bg-card)] p-6 rounded-lg shadow-sm border border-[var(--c-border-card)] flex flex-col items-center justify-center text-center">
          <h3 class="text-lg font-semibold text-[var(--c-text-headings)] mb-3">Pronunciation Score</h3>
          <div class="relative w-32 h-32">
            <svg class="w-full h-full" viewBox="0 0 36 36">
              <path class="stroke-current text-slate-200 dark:text-slate-700"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke-width="3" />
              <path [class]="getScoreRingColor(averagePronunciationScore())"
                    [attr.stroke-dasharray]="averagePronunciationScore() + ', 100'"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke-width="3"
                    stroke-linecap="round" />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-3xl font-bold" [class]="getScoreColor(averagePronunciationScore())">{{ averagePronunciationScore() }}</span>
            </div>
          </div>
        </div>
        <div class="bg-[var(--c-bg-card)] p-6 rounded-lg shadow-sm border border-[var(--c-border-card)] flex flex-col items-center justify-center text-center">
          <h3 class="text-lg font-semibold text-[var(--c-text-headings)] mb-3">Fluency Score</h3>
          <div class="relative w-32 h-32">
            <svg class="w-full h-full" viewBox="0 0 36 36">
              <path class="stroke-current text-slate-200 dark:text-slate-700"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke-width="3" />
              <path [class]="getScoreRingColor(averageFluencyScore())"
                    [attr.stroke-dasharray]="averageFluencyScore() + ', 100'"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke-width="3"
                    stroke-linecap="round" />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-3xl font-bold" [class]="getScoreColor(averageFluencyScore())">{{ averageFluencyScore() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Feedback -->
      <div class="bg-[var(--c-bg-card)] p-6 rounded-lg shadow-sm border border-[var(--c-border-card)]">
        <h3 class="text-xl font-semibold text-[var(--c-text-headings)] mb-4">Detailed Feedback</h3>
        <div class="space-y-4 max-h-64 overflow-y-auto">
          @for (item of history(); track item.id) {
            <div class="p-4 border-b border-[var(--c-border-card)] last:border-b-0">
              <p class="text-[var(--c-text-muted)] italic">"{{ item.target.text }}"</p>
              @if (item.assessment) {
                <div class="mt-3">
                  <p class="font-semibold text-sm text-[var(--c-text-body)]">{{ item.assessment.overall_feedback }}</p>
                  @if (item.assessment.suggestions.length > 0) {
                    <ul class="mt-2 list-disc list-inside space-y-1 text-sm text-[var(--c-text-muted)]">
                      @for (suggestion of item.assessment.suggestions; track $index) {
                        <li>{{ suggestion }}</li>
                      }
                    </ul>
                  }
                </div>
              } @else {
                <p class="mt-2 text-sm text-yellow-600 dark:text-yellow-400">Could not get feedback for this sentence.</p>
              }
            </div>
          } @empty {
            <p class="text-[var(--c-text-muted)] text-center py-4">No practice attempts were recorded.</p>
          }
        </div>
      </div>
      
      <!-- Actions -->
      <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button (click)="startNewSession.emit()" class="w-full sm:w-auto px-6 py-3 text-lg font-semibold rounded-md bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-md">
          <i class="fa-solid fa-rotate-left mr-2"></i> Start a New Session
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryViewComponent {
  store = inject(SessionStore);
  
  startNewSession = output<void>();

  readonly history = this.store.conversationHistory;
  readonly averagePronunciationScore = this.store.averagePronunciationScore;
  readonly averageFluencyScore = this.store.averageFluencyScore;
  readonly isSessionSuccessful = this.store.isSessionSuccessful;

  constructor() {
    this.playSummarySound();
  }

  private playSummarySound(): void {
    const soundFile = this.isSessionSuccessful() ? 'triumph.mp3' : 'failure.mp3';
    this.playAudio(soundFile);
  }

  private playAudio(fileName: string): void {
    const baseUrl = this.store.s3BaseUrl();
    if (!baseUrl || typeof window === 'undefined') {
        return;
    }
    const audio = new Audio(`${baseUrl}${fileName}`);
    audio.play().catch(e => console.error(`[Audio] Failed to play ${fileName}`, e));
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