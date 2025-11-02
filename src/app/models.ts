// FIX: Define the data models used throughout the application.
export interface Language {
  code: string;
  display_name: string;
  flag: string;
}

export interface HighlightedWord {
  word: string;
  translation: string;
  examples: string[];
}

export interface SentencePart {
  text: string;
  highlighted_words: HighlightedWord[];
}

export interface Sentence {
  id: string;
  source: SentencePart;
  target: SentencePart;
}

export interface ConversationScenario {
  id: string;
  name: string;
  description: string;
  difficulty_level: string;
  sentences: Sentence[];
}

export interface ScenarioSummary {
  id: string;
  name: string;
  description: string;
  difficulty_level: string;
}

export interface SpeechAssessment {
  overall_feedback: string;
  pronunciation_score: number;
  fluency_score: number;
  suggestions: string[];
}