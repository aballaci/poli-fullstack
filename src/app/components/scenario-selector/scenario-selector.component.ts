import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeminiService } from '../../services/gemini.service';
import { LanguageService } from '../../services/language.service';
import { SessionStore } from '../../state/session.store';
import { ConversationScenario, ScenarioSummary } from '../../models';
import { TOPICS_DATA, Category, Subtopic } from '../../topics.data';

type SelectorState = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-scenario-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  state = signal<SelectorState>('idle');
  error = signal<string | null>(null);
  activeTab = signal<'topics' | 'custom' | 'history'>('topics');

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

  // History tab state
  historyScenarios = signal<ScenarioSummary[]>([]);
  selectedHistoryId = signal<string | null>(null);
  filterByCurrentLevel = signal(false);

  // Organized history by topic and difficulty
  readonly organizedHistory = computed(() => {
    const scenarios = this.historyScenarios();
    const currentDifficulty = this.store.difficultyLevel();
    const filterByLevel = this.filterByCurrentLevel();

    // Filter by current difficulty level if toggle is on
    const filteredScenarios = filterByLevel && currentDifficulty
      ? scenarios.filter(s => s.difficulty_level === currentDifficulty)
      : scenarios;

    const organized: { [topic: string]: { [difficulty: string]: ScenarioSummary[] } } = {};

    const difficultyOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    for (const scenario of filteredScenarios) {
      const topic = scenario.topic || 'Other';
      const difficulty = scenario.difficulty_level;

      if (!organized[topic]) {
        organized[topic] = {};
      }
      if (!organized[topic][difficulty]) {
        organized[topic][difficulty] = [];
      }
      organized[topic][difficulty].push(scenario);
    }

    // Sort topics alphabetically
    const sortedTopics = Object.keys(organized).sort();
    const result: { topic: string; difficulties: { difficulty: string; scenarios: ScenarioSummary[] }[] }[] = [];

    for (const topic of sortedTopics) {
      const difficulties: { difficulty: string; scenarios: ScenarioSummary[] }[] = [];
      // Sort difficulties in order
      for (const diff of difficultyOrder) {
        if (organized[topic][diff]) {
          difficulties.push({
            difficulty: diff,
            scenarios: organized[topic][diff]
          });
        }
      }
      // Add any difficulties not in the standard list
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
    const sourceLang = this.store.sourceLanguage();
    const targetLang = this.store.targetLanguage();
    if (!sourceLang || !targetLang) {
      // Cannot load history without languages set.
      return;
    }
    this.state.set('loading');
    try {
      const scenarios = await this.geminiService.listPracticeScenarios(sourceLang, targetLang);
      this.historyScenarios.set(scenarios);
    } catch (e: any) {
      console.error('[ScenarioSelector] Failed to load history', e);
      // Don't show a blocking error for this non-critical feature.
      this.error.set(`Could not load practice history: ${e.message}`);
    } finally {
      if (this.state() !== 'error') {
        this.state.set('idle');
      }
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
      return newSet;
    });
    // Fetch existing scenarios only when a single topic is selected
    const topics = Array.from(this.selectedTopics());
    if (topics.length === 1) {
      this.fetchExistingMatches(topics[0]);
    } else {
      this.matchingScenarios.set(null);
    }
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
    this.selectedHistoryId.set(id);
    this.error.set(null);
    this.startLoadingMessages();
    try {
      const scenario = await this.geminiService.getScenarioById(id);
      this.store.startConversation(scenario);
      this.router.navigate(['/conversation']);
    } catch (e: any) {
      console.error(`[ScenarioSelector] Error loading scenario ${id} from history`, e);
      this.error.set(e.message || 'An unexpected error occurred while loading the scenario.');
      this.state.set('error');
    } finally {
      this.stopLoadingMessages();
      if (this.state() !== 'error') {
        this.state.set('idle');
      }
      this.selectedHistoryId.set(null);
    }
  }
}
