import { ChangeDetectionStrategy, Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { SessionStore } from '../../state/session.store';

@Component({
  selector: 'app-summary-view',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './summary-view.component.html',
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