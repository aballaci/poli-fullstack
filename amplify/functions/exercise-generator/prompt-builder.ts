import { Sentence } from "../scenario-generator/models.js";

export interface PromptContext {
    difficulty: string;
    sourceLang: string;
    targetLang: string;
}

/**
 * Build prompt for fill-in-the-blank exercise generation
 */
export function buildFillInBlankPrompt(
    sentences: Sentence[],
    context: PromptContext
): string {
    const sentenceList = sentences
        .map((s, idx) => `${idx + 1}. [ID: ${s.id}] ${s.target.text}`)
        .join('\n');

    return `Generate fill-in-the-blank exercises for language learning.

Context:
- Target Language: ${context.targetLang}
- Source Language: ${context.sourceLang}
- CEFR Difficulty Level: ${context.difficulty}

Sentences in ${context.targetLang}:
${sentenceList}

For each sentence:
1. Select ONE important word to remove (appropriate for ${context.difficulty} level)
2. Replace it with a blank (use "___" or similar marker)
3. Generate 3 plausible incorrect options plus the correct answer
4. Ensure all 4 options are grammatically appropriate for the blank position
5. Include the sentence ID, the sentence with blank, blank position (word index), correct answer, and all 4 options

Return a JSON object matching the provided schema with an array of exercises.`;
}

/**
 * Build prompt for matching pairs exercise generation
 */
export function buildMatchingPairsPrompt(
    sentences: Sentence[],
    context: PromptContext
): string {
    const pairsList = sentences
        .map((s, idx) => `${idx + 1}. [ID: ${s.id}]\n   Source (${context.sourceLang}): ${s.source.text}\n   Target (${context.targetLang}): ${s.target.text}`)
        .join('\n\n');

    return `Generate a matching pairs exercise for language learning.

Context:
- Source Language: ${context.sourceLang}
- Target Language: ${context.targetLang}
- CEFR Difficulty Level: ${context.difficulty}

Sentence Pairs:
${pairsList}

Create a matching pairs game where:
1. List all source language sentences with their IDs
2. List all target language sentences with their IDs (in a different order for the game)
3. Provide the correct pairings (sourceId to targetId mappings)

The learner will match source sentences to their target translations.

Return a JSON object matching the provided schema with sourceSentences, targetSentences, and correctPairs arrays.`;
}

/**
 * Build prompt for sentence scramble exercise generation
 */
export function buildSentenceScramblePrompt(
    sentences: Sentence[],
    context: PromptContext
): string {
    const pairsList = sentences
        .map((s, idx) => `${idx + 1}. [ID: ${s.id}]\n   Source (${context.sourceLang}): ${s.source.text}\n   Target (${context.targetLang}): ${s.target.text}`)
        .join('\n\n');

    return `Generate sentence scramble exercises for language learning.

Context:
- Source Language: ${context.sourceLang}
- Target Language: ${context.targetLang}
- CEFR Difficulty Level: ${context.difficulty}

Sentence Pairs:
${pairsList}

For each sentence pair:
1. Show the source language sentence as a reference
2. Split the target language sentence into individual words
3. Scramble the words into a random order
4. Provide the correct order as an array of indices (0-based)

The learner will see the source sentence and must arrange the scrambled target words in the correct order.

Return a JSON object matching the provided schema with an array of exercises.`;
}

/**
 * Build prompt for swipe exercise generation
 */
export function buildSwipeExercisePrompt(
    sentences: Sentence[],
    context: PromptContext
): string {
    const vocabularyList = sentences
        .flatMap(s => [
            ...s.source.highlighted_words.map(hw => `${hw.word} (${context.sourceLang})`),
            ...s.target.highlighted_words.map(hw => `${hw.word} (${context.targetLang})`)
        ])
        .join(', ');

    const sentenceList = sentences
        .map((s, idx) => `${idx + 1}. ${s.source.text} / ${s.target.text}`)
        .join('\n');

    return `Generate a swipe-based translation exercise for language learning (Tinder-style).

Context:
- Source Language: ${context.sourceLang}
- Target Language: ${context.targetLang}
- CEFR Difficulty Level: ${context.difficulty}

Vocabulary: ${vocabularyList}

Sentences:
${sentenceList}

Create 15-20 swipe cards with:
1. A mix of correct translations (60-70%) and plausible incorrect translations (30-40%)
2. Use vocabulary words and short phrases from the sentences
3. Each card has: word/phrase, translation, and isCorrect boolean
4. Include both directions: ${context.sourceLang} → ${context.targetLang} and ${context.targetLang} → ${context.sourceLang}
5. Make incorrect translations plausible but clearly wrong to a learner at ${context.difficulty} level

The learner will swipe right for correct translations and left for incorrect ones.

Return a JSON object matching the provided schema with an array of cards.`;
}
