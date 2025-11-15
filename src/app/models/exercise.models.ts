// Exercise Type Enum and Info
export type ExerciseType = 'fillInBlank' | 'matchingPairs' | 'sentenceScramble' | 'swipe';

export interface ExerciseTypeInfo {
    type: ExerciseType;
    displayName: string;
    icon: string;
    description: string;
}

// Fill-in-the-Blank Exercise Models
export interface FillInBlankExercise {
    sentenceId: string;
    sentenceWithBlank: string;
    blankPosition: number;
    correctAnswer: string;
    options: string[];
    targetLanguage: string;
}

export interface FillInBlankExercises {
    exercises: FillInBlankExercise[];
}

// Matching Pairs Exercise Models
export interface WordItem {
    id: string;
    word: string;
}

export interface MatchingPairsExercise {
    sourceWords: WordItem[];
    targetWords: WordItem[];
    correctPairs: Array<{ sourceId: string; targetId: string }>;
}

// Sentence Scramble Exercise Models
export interface SentenceScrambleExercise {
    sentenceId: string;
    sourceText: string;
    scrambledWords: string[];
    correctOrder: number[];
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

// Union type for all exercise data
export type ExerciseData =
    | FillInBlankExercises
    | MatchingPairsExercise
    | SentenceScrambleExercises
    | SwipeExercise;
