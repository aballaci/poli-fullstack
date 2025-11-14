// Fill-in-the-Blank Exercise Models
export interface FillInBlankExercise {
    sentenceId: string;
    sentenceWithBlank: string;
    blankPosition: number;
    correctAnswer: string;
    options: string[]; // Array of 4 options (includes correct answer)
    targetLanguage: string;
}

export interface FillInBlankExercises {
    exercises: FillInBlankExercise[];
}

// Matching Pairs Exercise Models
export interface MatchingPair {
    id: string;
    sourceWord: string;
    targetWord: string;
}

export interface MatchingPairsExercise {
    sourceWords: Array<{ id: string; word: string }>;
    targetWords: Array<{ id: string; word: string }>;
    correctPairs: Array<{ sourceId: string; targetId: string }>;
}

// Sentence Scramble Exercise Models
export interface SentenceScrambleExercise {
    sentenceId: string;
    sourceText: string;
    scrambledWords: string[];
    correctOrder: number[]; // Indices representing correct order
    targetLanguage: string;
}

export interface SentenceScrambleExercises {
    exercises: SentenceScrambleExercise[];
}

// Swipe Exercise Models
export interface SwipeCard {
    id: string;
    word: string;
    translation: string;
    isCorrect: boolean;
    sourceLanguage: string;
    targetLanguage: string;
}

export interface SwipeExercise {
    cards: SwipeCard[];
}
