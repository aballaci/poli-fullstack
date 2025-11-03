import { Injectable, computed, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ConversationScenario, HighlightedWord, Language, Sentence, SpeechAssessment } from '../models';

const SOURCE_LANG_KEY = 'poli_source_lang';
const TARGET_LANG_KEY = 'poli_target_lang';
const DIFFICULTY_KEY = 'poli_difficulty';
const MOCK_API_KEY = 'poli_mock_api';
const FONT_SIZE_KEY = 'poli_font_size';
const INTRO_SEEN_KEY = 'poli_intro_seen';
const PRACTICE_INSTRUCTIONS_SEEN_KEY = 'poli_practice_instructions_seen';
const PRACTICE_MODE_KEY = 'poli_practice_mode';
const USE_AI_KEY = 'poli_use_ai';
const FLOW_DIRECTION_KEY = 'poli_flow_direction';


export interface SentenceResult extends Sentence {
  assessment: SpeechAssessment | null;
  userTranscript?: string;
}

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private platformId = inject(PLATFORM_ID);

  // Writable signals for core state
  readonly sourceLanguage = signal<Language | null>(this.load(SOURCE_LANG_KEY));
  readonly targetLanguage = signal<Language | null>(this.load(TARGET_LANG_KEY));
  readonly difficultyLevel = signal<string | null>(this.load(DIFFICULTY_KEY));
  readonly mockApiMode = signal<boolean>(this.load(MOCK_API_KEY) ?? false);
  readonly s3BaseUrl = signal<string | null>(null);
  readonly readingFontSize = signal<number>(this.load(FONT_SIZE_KEY) ?? 16);
  
  // App-level visibility states
  readonly introSeen = signal<boolean>(this.load(INTRO_SEEN_KEY) ?? false);
  readonly practiceInstructionsSeen = signal<boolean>(this.load(PRACTICE_INSTRUCTIONS_SEEN_KEY) ?? false);

  // Practice-specific settings
  readonly practiceMode = signal<'practice' | 'challenge'>(this.load(PRACTICE_MODE_KEY) ?? 'practice');
  readonly useAIComparison = signal<boolean>(this.load(USE_AI_KEY) ?? true);
  readonly flowDirection = signal<'source-to-target' | 'target-to-source'>(this.load(FLOW_DIRECTION_KEY) ?? 'source-to-target');
  
  // Active session state
  readonly activeScenario = signal<ConversationScenario | null>(null);
  readonly conversationHistory = signal<SentenceResult[]>([]);

  // Computed signal to check if basic setup is complete
  readonly isConfigured = computed(() => {
    return !!this.sourceLanguage() && !!this.targetLanguage() && !!this.difficultyLevel();
  });
  
  // All highlighted words from the current scenario, for flashcards
  // Only collects from target language to ensure examples are always in target language
  readonly allHighlightedWords = computed(() => {
    const scenario = this.activeScenario();
    if (!scenario) return [];
    
    const words = new Map<string, HighlightedWord>();
    scenario.sentences.forEach(s => {
        // Only collect from target language sentences to ensure examples are in target language
        s.target.highlighted_words.forEach(w => {
            if (!words.has(w.word.toLowerCase())) {
                words.set(w.word.toLowerCase(), w);
            }
        });
    });
    return Array.from(words.values());
  });

  readonly averagePronunciationScore = computed(() => {
    const history = this.conversationHistory();
    const assessedItems = history.filter(item => item.assessment?.pronunciation_score != null);
    if (assessedItems.length === 0) return 0;
    const total = assessedItems.reduce((acc, item) => acc + (item.assessment?.pronunciation_score ?? 0), 0);
    return Math.round(total / assessedItems.length);
  });

  readonly averageFluencyScore = computed(() => {
    const history = this.conversationHistory();
    const assessedItems = history.filter(item => item.assessment?.fluency_score != null);
    if (assessedItems.length === 0) return 0;
    const total = assessedItems.reduce((acc, item) => acc + (item.assessment?.fluency_score ?? 0), 0);
    return Math.round(total / assessedItems.length);
  });

  readonly isSessionSuccessful = computed(() => {
    return this.averagePronunciationScore() >= 70;
  });


  constructor() {
    // Effects to persist changes to localStorage
    effect(() => this.save(SOURCE_LANG_KEY, this.sourceLanguage()));
    effect(() => this.save(TARGET_LANG_KEY, this.targetLanguage()));
    effect(() => this.save(DIFFICULTY_KEY, this.difficultyLevel()));
    effect(() => this.save(MOCK_API_KEY, this.mockApiMode()));
    effect(() => this.save(FONT_SIZE_KEY, this.readingFontSize()));
    effect(() => this.save(INTRO_SEEN_KEY, this.introSeen()));
    effect(() => this.save(PRACTICE_INSTRUCTIONS_SEEN_KEY, this.practiceInstructionsSeen()));
    effect(() => this.save(PRACTICE_MODE_KEY, this.practiceMode()));
    effect(() => this.save(USE_AI_KEY, this.useAIComparison()));
    effect(() => this.save(FLOW_DIRECTION_KEY, this.flowDirection()));
  }

  // --- Actions ---

  setReadingFontSize(size: number): void {
    this.readingFontSize.set(size);
  }

  setS3BaseUrl(url: string): void {
    this.s3BaseUrl.set(url);
  }

  setSourceLanguage(lang: Language): void {
    this.sourceLanguage.set(lang);
  }

  setTargetLanguage(lang: Language): void {
    this.targetLanguage.set(lang);
  }

  setDifficulty(level: string): void {
    this.difficultyLevel.set(level);
  }

  toggleMockApiMode(): void {
    this.mockApiMode.update(enabled => !enabled);
  }

  setIntroSeen(seen: boolean): void {
    this.introSeen.set(seen);
  }

  setPracticeInstructionsSeen(seen: boolean): void {
    this.practiceInstructionsSeen.set(seen);
  }

  setPracticeMode(mode: 'practice' | 'challenge'): void {
    this.practiceMode.set(mode);
  }
  
  setUseAIComparison(useAI: boolean): void {
    this.useAIComparison.set(useAI);
  }
  
  setFlowDirection(direction: 'source-to-target' | 'target-to-source'): void {
    this.flowDirection.set(direction);
  }

  toggleFlowDirection(): void {
    this.flowDirection.update(d => d === 'source-to-target' ? 'target-to-source' : 'source-to-target');
  }

  startConversation(scenario: ConversationScenario): void {
    this.activeScenario.set(scenario);
    this.conversationHistory.set([]); // Clear previous history
  }

  addSentenceResult(sentence: Sentence, assessment: SpeechAssessment | null, userTranscript?: string): void {
    this.conversationHistory.update(history => {
      const existingIndex = history.findIndex(item => item.id === sentence.id);
      const newResult: SentenceResult = { ...sentence, assessment, userTranscript };

      if (existingIndex > -1) {
        // An entry for this sentence already exists, so we replace it with the latest attempt.
        const updatedHistory = [...history];
        updatedHistory[existingIndex] = newResult;
        return updatedHistory;
      } else {
        // This is the first attempt for this sentence, add it to the history.
        return [...history, newResult];
      }
    });
  }
  
  endConversation(): void {
      // We keep the active scenario and history for the summary view.
      // The summary view component will be responsible for clearing them
      // when the user decides to start a new scenario.
  }
  
  resetConversation(): void {
    this.activeScenario.set(null);
    this.conversationHistory.set([]);
  }

  resetConversationHistory(): void {
    this.conversationHistory.set([]);
  }

  // --- Private persistence helpers ---

  private save<T>(key: string, value: T | null): void {
    if (isPlatformBrowser(this.platformId)) {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  }

  private load<T>(key: string): T | null {
    if (isPlatformBrowser(this.platformId)) {
      const item = localStorage.getItem(key);
      try {
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.error(`Failed to parse ${key} from localStorage`, e);
        localStorage.removeItem(key); // Clear corrupted data
        return null;
      }
    }
    return null;
  }
}