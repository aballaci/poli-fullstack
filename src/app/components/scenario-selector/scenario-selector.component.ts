import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeminiService } from '../../services/gemini.service';
import { LanguageService } from '../../services/language.service';
import { SessionStore } from '../../state/session.store';
import { ThemeService } from '../../services/theme.service';
import { ConversationScenario, ScenarioSummary } from '../../models';
import { TOPICS_DATA, Category, Subtopic } from '../../topics.data';
import { ScenarioCatalogComponent } from '../scenario-catalog/scenario-catalog.component';
import { ScenarioHistoryComponent } from '../scenario-history/scenario-history.component';

type SelectorState = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-scenario-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, ScenarioCatalogComponent, ScenarioHistoryComponent],
  templateUrl: './scenario-selector.component.html',
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioSelectorComponent implements OnInit {
  geminiService = inject(GeminiService);
  languageService = inject(LanguageService);
  store = inject(SessionStore);
  router = inject(Router);
  themeService = inject(ThemeService);

  state = signal<SelectorState>('idle');
  error = signal<string | null>(null);
  activeTab = signal<'topics' | 'custom' | 'catalog' | 'history'>('topics');

  // Topics tab state
  topics = signal<Category[]>(TOPICS_DATA);
  selectedTopics = signal<Set<Subtopic>>(new Set());
  wizardStep = signal<'category' | 'subtopic'>('category');
  activeCategory = signal<Category | null>(null);

  // Matching scenarios for a selected topic
  isFetchingMatches = signal(false);
  matchingScenarios = signal<ScenarioSummary[] | null>(null);

  // Colors for category cards
  protected readonly categoryColors: { [key: string]: { icon: string; borderHover: string; borderSelected: string; } } = {
    'everyday-social': { icon: 'text-sky-500', borderHover: 'hover:border-sky-400', borderSelected: 'border-sky-400' },
    'travel-transport': { icon: 'text-violet-500', borderHover: 'hover:border-violet-400', borderSelected: 'border-violet-400' },
    'food-dining': { icon: 'text-emerald-500', borderHover: 'hover:border-emerald-400', borderSelected: 'border-emerald-400' },
    'home-family': { icon: 'text-rose-500', borderHover: 'hover:border-rose-400', borderSelected: 'border-rose-400' },
    'work-professions': { icon: 'text-slate-500', borderHover: 'hover:border-slate-400', borderSelected: 'border-slate-400' },
    'education-academia': { icon: 'text-amber-500', borderHover: 'hover:border-amber-400', borderSelected: 'border-amber-400' },
    'culture-media': { icon: 'text-fuchsia-500', borderHover: 'hover:border-fuchsia-400', borderSelected: 'border-fuchsia-400' },
    'health-wellness': { icon: 'text-red-500', borderHover: 'hover:border-red-400', borderSelected: 'border-red-400' },
    'shopping-money': { icon: 'text-lime-500', borderHover: 'hover:border-lime-400', borderSelected: 'border-lime-400' },
    'civic-logistics': { icon: 'text-cyan-500', borderHover: 'hover:border-cyan-400', borderSelected: 'border-cyan-400' },
  };

  // Custom text tab state
  customText = signal('');


  // Loading state
  private loadingInterval: any;
  loadingMessages = [
    'Crafting your scenario...',
    'Gathering vocabulary...',
    'Translating sentences...',
    'Building your lesson...',
    'Checking for cultural nuances...',
    'Polishing the details...',
    'Almost there...'
  ];
  loadingMessage = signal(this.loadingMessages[0]);

  ngOnInit(): void {
    // History loading is now handled by PresentScenariosComponent
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


  onCustomTextInput(event: Event): void {
    this.customText.set((event.target as HTMLTextAreaElement).value);
  }

  selectCategory(category: Category): void {
    this.activeCategory.set(category);
    this.wizardStep.set('subtopic');
    // Reset matches when changing category
    this.matchingScenarios.set(null);
  }

  goBackToCategories(): void {
    this.activeCategory.set(null);
    this.wizardStep.set('category');
    // Clear selected topics when going back to avoid confusion
    this.selectedTopics.set(new Set());
  }

  toggleTopic(topic: Subtopic): void {
    this.selectedTopics.update(currentSet => {
      const newSet = new Set(currentSet);
      if (newSet.has(topic)) {
        newSet.delete(topic);
      } else {
        newSet.add(topic);
      }

      // Fetch existing scenarios after updating the set
      const updatedTopics = Array.from(newSet);
      if (updatedTopics.length === 0) {
        this.matchingScenarios.set(null);
      } else if (updatedTopics.length === 1) {
        this.fetchExistingMatches(updatedTopics[0]);
      } else {
        this.fetchExistingMatchesForMultiple(updatedTopics);
      }

      return newSet;
    });
  }

  isSelected(topic: Subtopic): boolean {
    return this.selectedTopics().has(topic);
  }

  private async fetchExistingMatches(topic: Subtopic): Promise<void> {
    const sourceLang = this.store.sourceLanguage();
    const targetLang = this.store.targetLanguage();
    const difficulty = this.store.difficultyLevel();

    if (!sourceLang || !targetLang || !difficulty) {
      this.matchingScenarios.set(null);
      return;
    }
    this.isFetchingMatches.set(true);
    try {
      const scenarios = await this.geminiService.listExistingScenariosByTopic(
        sourceLang,
        targetLang,
        difficulty,
        topic.label
      );
      this.matchingScenarios.set(scenarios);
    } catch (e) {
      console.error('[ScenarioSelector] Failed to fetch existing scenarios by topic', e);
      this.matchingScenarios.set([]);
    } finally {
      this.isFetchingMatches.set(false);
    }
  }

  private async fetchExistingMatchesForMultiple(topics: Subtopic[]): Promise<void> {
    const sourceLang = this.store.sourceLanguage();
    const targetLang = this.store.targetLanguage();
    const difficulty = this.store.difficultyLevel();

    if (!sourceLang || !targetLang || !difficulty) {
      this.matchingScenarios.set(null);
      return;
    }
    this.isFetchingMatches.set(true);
    try {
      const topicLabels = topics.map(t => t.label);
      const scenarios = await this.geminiService.listExistingScenariosByTopics(
        sourceLang,
        targetLang,
        difficulty,
        topicLabels
      );
      this.matchingScenarios.set(scenarios);
    } catch (e) {
      console.error('[ScenarioSelector] Failed to fetch existing scenarios for multiple topics', e);
      this.matchingScenarios.set([]);
    } finally {
      this.isFetchingMatches.set(false);
    }
  }

  async generateFromTopics(): Promise<void> {
    this.state.set('loading');
    this.error.set(null);
    this.startLoadingMessages();

    const sourceLang = this.store.sourceLanguage();
    const targetLang = this.store.targetLanguage();
    const difficulty = this.store.difficultyLevel();
    // FIX: Explicitly type 't' as Subtopic to fix TypeScript inference issue.
    const topics = Array.from(this.selectedTopics()).map((t: Subtopic) => t.label).join(', ');

    if (!sourceLang || !targetLang || !difficulty || !topics) {
      this.error.set("Missing required information: languages, difficulty, or topics.");
      this.state.set('error');
      this.stopLoadingMessages();
      return;
    }

    try {
      const scenario = await this.geminiService.generateScenario(topics, difficulty, sourceLang, targetLang);
      this.store.startConversation(scenario);
      // Save to history with topic information
      const selectedTopicsArray = Array.from(this.selectedTopics());
      // Find the category for the first selected topic
      let category: string | undefined = undefined;
      if (selectedTopicsArray.length > 0) {
        const firstTopic = selectedTopicsArray[0];
        const foundCategory = this.topics().find(cat =>
          cat.children.some(sub => sub.id === firstTopic.id)
        );
        category = foundCategory?.label;
      }
      const topic = topics;
      await this.geminiService.saveToHistory(scenario, category, topic);
      this.router.navigate(['/conversation']);
    } catch (e: any) {
      console.error('[ScenarioSelector] Error generating scenario from topics', e);
      this.error.set(e.message || 'An unexpected error occurred.');
      this.state.set('error');
    } finally {
      this.stopLoadingMessages();
      if (this.state() !== 'error') {
        this.state.set('idle');
      }
    }
  }

  async generateFromCustomText(): Promise<void> {
    this.state.set('loading');
    this.error.set(null);
    this.startLoadingMessages();

    const sourceLang = this.store.sourceLanguage();
    const targetLang = this.store.targetLanguage();
    const difficulty = this.store.difficultyLevel();
    const text = this.customText().trim();

    if (!sourceLang || !targetLang || !difficulty || !text) {
      this.error.set("Missing required information: languages, difficulty, or custom text.");
      this.state.set('error');
      this.stopLoadingMessages();
      return;
    }

    try {
      // Assuming user inputs text in their target language for simplicity, can be improved with a toggle
      const scenario = await this.geminiService.processCustomText(text, 'target', difficulty, sourceLang, targetLang);
      this.store.startConversation(scenario);
      // Save to history (custom text doesn't have category/topic)
      await this.geminiService.saveToHistory(scenario);
      this.router.navigate(['/conversation']);
    } catch (e: any) {
      console.error('[ScenarioSelector] Error generating scenario from custom text', e);
      this.error.set(e.message || 'An unexpected error occurred.');
      this.state.set('error');
    } finally {
      this.stopLoadingMessages();
      if (this.state() !== 'error') {
        this.state.set('idle');
      }
    }
  }

  async loadFromHistory(id: string): Promise<void> {
    this.state.set('loading');
    this.error.set(null);
    this.startLoadingMessages();
    try {
      const scenario = await this.geminiService.getScenarioById(id);
      this.store.startConversation(scenario);
      // Save to history when loading from matching scenarios
      await this.geminiService.saveToHistory(scenario);
      this.router.navigate(['/conversation']);
    } catch (e: any) {
      console.error(`[ScenarioSelector] Error loading scenario ${id}`, e);
      this.error.set(e.message || 'An unexpected error occurred while loading the scenario.');
      this.state.set('error');
    } finally {
      this.stopLoadingMessages();
      if (this.state() !== 'error') {
        this.state.set('idle');
      }
    }
  }

  // Helper to get difficulty level tag color and text
  getDifficultyTag(difficulty: string): { text: string; bgColor: string; textColor: string } {
    const level = difficulty.toUpperCase();
    if (level === 'A1' || level === 'A2') {
      return {
        text: 'Beginner',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
        textColor: 'text-emerald-600 dark:text-emerald-300'
      };
    } else if (level === 'B1' || level === 'B2') {
      return {
        text: 'Intermediate',
        bgColor: 'bg-amber-50 dark:bg-amber-900/30',
        textColor: 'text-amber-600 dark:text-amber-300'
      };
    } else if (level === 'C1' || level === 'C2') {
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

  // Helper to get category/topic tag
  getCategoryTag(topic?: string): string {
    return topic || 'Custom';
  }

  // Helper to get category tag classes
  getCategoryTagClasses(): string {
    return 'px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300';
  }

}
