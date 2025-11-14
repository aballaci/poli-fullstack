import { Type } from "@google/genai";

// Fill-in-the-Blank Exercise Schema
export const fillInBlankSchema = {
    type: Type.OBJECT,
    properties: {
        exercises: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sentenceId: { type: Type.STRING },
                    sentenceWithBlank: { type: Type.STRING },
                    blankPosition: { type: Type.NUMBER },
                    correctAnswer: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    targetLanguage: { type: Type.STRING }
                },
                required: ["sentenceId", "sentenceWithBlank", "blankPosition", "correctAnswer", "options", "targetLanguage"]
            }
        }
    },
    required: ["exercises"]
};

// Matching Pairs Exercise Schema
export const matchingPairsSchema = {
    type: Type.OBJECT,
    properties: {
        sourceWords: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    word: { type: Type.STRING }
                },
                required: ["id", "word"]
            }
        },
        targetWords: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    word: { type: Type.STRING }
                },
                required: ["id", "word"]
            }
        },
        correctPairs: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sourceId: { type: Type.STRING },
                    targetId: { type: Type.STRING }
                },
                required: ["sourceId", "targetId"]
            }
        }
    },
    required: ["sourceWords", "targetWords", "correctPairs"]
};

// Sentence Scramble Exercise Schema
export const sentenceScrambleSchema = {
    type: Type.OBJECT,
    properties: {
        exercises: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sentenceId: { type: Type.STRING },
                    sourceText: { type: Type.STRING },
                    scrambledWords: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    correctOrder: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER }
                    },
                    targetLanguage: { type: Type.STRING }
                },
                required: ["sentenceId", "sourceText", "scrambledWords", "correctOrder", "targetLanguage"]
            }
        }
    },
    required: ["exercises"]
};

// Swipe Exercise Schema
export const swipeExerciseSchema = {
    type: Type.OBJECT,
    properties: {
        cards: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    word: { type: Type.STRING },
                    translation: { type: Type.STRING },
                    isCorrect: { type: Type.BOOLEAN },
                    sourceLanguage: { type: Type.STRING },
                    targetLanguage: { type: Type.STRING }
                },
                required: ["id", "word", "translation", "isCorrect", "sourceLanguage", "targetLanguage"]
            }
        }
    },
    required: ["cards"]
};
