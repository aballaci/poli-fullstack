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

  // Flatten history to a simple list for card display
  readonly historyList = computed(() => {
    const items = this.historyItems();
    // Sort by date (most recent first)
    return [...items].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  // Helper to get difficulty level tag color and text with sweet colors
  getDifficultyTag(difficulty: string): { text: string; bgColor: string; textColor: string } {
    const level = difficulty.toUpperCase();
    if (level === 'A1' || level === 'A2') {
      // Soft mint/emerald for beginner
      return { 
        text: 'Beginner', 
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', 
        textColor: 'text-emerald-600 dark:text-emerald-300' 
      };
    } else if (level === 'B1' || level === 'B2') {
      // Soft peach/amber for intermediate
      return { 
        text: 'Intermediate', 
        bgColor: 'bg-amber-50 dark:bg-amber-900/30', 
        textColor: 'text-amber-600 dark:text-amber-300' 
      };
    } else if (level === 'C1' || level === 'C2') {
      // Soft rose/pink for advanced
      return { 
        text: 'Advanced', 
        bgColor: 'bg-rose-50 dark:bg-rose-900/30', 
        textColor: 'text-rose-600 dark:text-rose-300' 
      };
    }
    return { 
      text: difficulty, 
      bgColor: 'bg-slate-100 dark:bg-slate-700', 
      textColor: 'text-slate-600 dark:text-slate-300' 
    };
  }

  // Helper to get difficulty tag classes as a single string
  getDifficultyTagClasses(difficulty: string): string {
    const tag = this.getDifficultyTag(difficulty);
    return `px-2.5 py-1 rounded-md text-xs font-medium ${tag.bgColor} ${tag.textColor}`;
  }

  // Helper to get difficulty tag text
  getDifficultyTagText(difficulty: string): string {
    return this.getDifficultyTag(difficulty).text;
  }

  // Helper to get category/topic tag with sweet colors
  getCategoryTag(topic?: string, category?: string): string {
    return topic || category || 'General';
  }

  // Helper to get category tag classes
  getCategoryTagClasses(): string {
    // Soft lavender/indigo for category
    return 'px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300';
  }

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

