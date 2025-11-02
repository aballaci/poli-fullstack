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
