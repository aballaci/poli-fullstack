import { ConversationScenario, Sentence } from "../scenario-generator/models.js";
import {
    FillInBlankExercises,
    MatchingPairsExercise,
    SentenceScrambleExercises,
    SwipeExercise
} from "./models.js";
import {
    fillInBlankSchema,
    matchingPairsSchema,
    sentenceScrambleSchema,
    swipeExerciseSchema
} from "./schemas.js";
import { generateStructuredContent } from "./gemini-client.js";
import {
    buildFillInBlankPrompt,
    buildMatchingPairsPrompt,
    buildSentenceScramblePrompt,
    buildSwipeExercisePrompt,
    PromptContext
} from "./prompt-builder.js";

/**
 * Generate fill-in-the-blank exercises from scenario sentences
 */
export async function generateFillInBlankExercises(
    scenario: ConversationScenario,
    context: PromptContext
): Promise<{ data: FillInBlankExercises; response: any }> {
    const sentences = scenario.sentences;
    const prompt = buildFillInBlankPrompt(sentences, context);

    const result = await generateStructuredContent<FillInBlankExercises>({
        prompt,
        schema: fillInBlankSchema
    });

    return result;
}

/**
 * Generate matching pairs exercise from scenario sentences
 */
export async function generateMatchingPairsExercise(
    scenario: ConversationScenario,
    context: PromptContext
): Promise<{ data: MatchingPairsExercise; response: any }> {
    const sentences = scenario.sentences;
    const prompt = buildMatchingPairsPrompt(sentences, context);

    const result = await generateStructuredContent<MatchingPairsExercise>({
        prompt,
        schema: matchingPairsSchema
    });

    return result;
}

/**
 * Generate sentence scramble exercises from scenario sentences
 */
export async function generateSentenceScrambleExercises(
    scenario: ConversationScenario,
    context: PromptContext
): Promise<{ data: SentenceScrambleExercises; response: any }> {
    const sentences = scenario.sentences;
    const prompt = buildSentenceScramblePrompt(sentences, context);

    const result = await generateStructuredContent<SentenceScrambleExercises>({
        prompt,
        schema: sentenceScrambleSchema
    });

    return result;
}

/**
 * Generate swipe exercise from scenario vocabulary and sentences
 */
export async function generateSwipeExercise(
    scenario: ConversationScenario,
    context: PromptContext
): Promise<{ data: SwipeExercise; response: any }> {
    const sentences = scenario.sentences;
    const prompt = buildSwipeExercisePrompt(sentences, context);

    const result = await generateStructuredContent<SwipeExercise>({
        prompt,
        schema: swipeExerciseSchema
    });

    return result;
}
