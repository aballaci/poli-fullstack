import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GeminiService } from '../../services/gemini.service';
import { SessionStore } from '../../state/session.store';
import { HistoryItem } from '../../models';

@Component({
  selector: 'app-scenario-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scenario-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioHistoryComponent implements OnInit, OnDestroy {
  geminiService = inject(GeminiService);
  store = inject(SessionStore);
  router = inject(Router);

  // History state
  historyItems = signal<HistoryItem[]>([]);
  selectedHistoryId = signal<string | null>(null);
  loadingMessage = signal('Loading history...');
  error = signal<string | null>(null);

  // Organized history by topic and difficulty
  readonly organizedHistory = computed(() => {
    const allItems = this.historyItems();
    const currentDifficulty = this.store.difficultyLevel();

    const organized: { [topic: string]: { [difficulty: string]: HistoryItem[] } } = {};
    const difficultyOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    for (const item of allItems) {
      const topic = item.topic || item.category || 'Other';
      const difficulty = item.difficulty;

      if (!organized[topic]) {
        organized[topic] = {};
      }
      if (!organized[topic][difficulty]) {
        organized[topic][difficulty] = [];
      }
      organized[topic][difficulty].push(item);
    }

    const sortedTopics = Object.keys(organized).sort();
    const result: { topic: string; difficulties: { difficulty: string; scenarios: HistoryItem[] }[] }[] = [];

    for (const topic of sortedTopics) {
      const difficulties: { difficulty: string; scenarios: HistoryItem[] }[] = [];
      for (const diff of difficultyOrder) {
        if (organized[topic][diff]) {
          difficulties.push({
            difficulty: diff,
            scenarios: organized[topic][diff]
          });
        }
      }
      for (const diff of Object.keys(organized[topic])) {
        if (!difficultyOrder.includes(diff)) {
          difficulties.push({
            difficulty: diff,
            scenarios: organized[topic][diff]
          });
        }
      }
      result.push({ topic, difficulties });
    }
    return result;
  });

  private loadingInterval: any;
  private loadingMessages = [
    'Loading history...',
    'Fetching your practice history...',
    'Almost there...'
  ];

  ngOnInit(): void {
    this.loadHistory();
  }

  private startLoadingMessages(): void {
    this.loadingMessage.set(this.loadingMessages[0]);
    let messageIndex = 1;
    this.loadingInterval = setInterval(() => {
      this.loadingMessage.set(this.loadingMessages[messageIndex % this.loadingMessages.length]);
      messageIndex++;
    }, 3500);
  }

  private stopLoadingMessages(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
  }

  async loadHistory(): Promise<void> {
    this.error.set(null);
    this.startLoadingMessages();
    try {
      const items = await this.geminiService.loadHistory();
      this.historyItems.set(items);
    } catch (e: any) {
      console.error('[ScenarioHistory] Failed to load history', e);
      this.error.set(`Could not load history: ${e.message}`);
    } finally {
      this.stopLoadingMessages();
    }
  }

  async loadFromHistory(item: HistoryItem): Promise<void> {
    this.selectedHistoryId.set(item.scenarioId);
    this.error.set(null);
    this.startLoadingMessages();
    try {
      const scenario = await this.geminiService.getScenarioById(item.scenarioId);
      if (!scenario) {
        throw new Error('Scenario not found. It may have been deleted.');
      }
      this.store.startConversation(scenario);
      this.router.navigate(['/conversation']);
    } catch (e: any) {
      console.error(`[ScenarioHistory] Error loading scenario ${item.scenarioId}`, e);
      const errorMessage = e.message || 'An unexpected error occurred while loading the scenario.';
      this.error.set(errorMessage);
      // Don't clear selectedHistoryId on error so user can see which item failed
    } finally {
      this.stopLoadingMessages();
      this.selectedHistoryId.set(null);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  ngOnDestroy(): void {
    this.stopLoadingMessages();
  }
}

