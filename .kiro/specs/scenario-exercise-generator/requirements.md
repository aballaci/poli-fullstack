# Requirements Document

## Introduction

This feature automatically generates four types of language learning exercises whenever a new scenario is created in the Scenario DynamoDB table. A Lambda function will be triggered by DynamoDB Streams to process the scenario JSON and call Google AI to generate: fill-in-the-blank exercises, matching pairs games, sentence scramble exercises, and Tinder-style swipe exercises. The generated exercises will be stored back in the Scenario table as new fields.

## Glossary

- **Scenario Table**: The DynamoDB table that stores conversation scenarios with sentence pairs in source and target languages
- **Exercise Generator Lambda**: The Lambda function triggered by DynamoDB Streams when a Scenario item is created
- **Google AI Service**: The Google Generative AI API used to generate exercise content
- **Fill-in-the-Blank Exercise**: A language exercise where one word is removed from a sentence and the learner must select the correct word from four options
- **Matching Pairs Exercise**: A game where learners match source language sentences with their target language translations
- **Sentence Scramble Exercise**: An exercise where learners arrange jumbled target language words into the correct order based on a source language sentence
- **Swipe Exercise**: A rapid-fire review mechanic where learners swipe right for correct translations and left for incorrect ones
- **Scenario JSON**: The JSON object stored in the scenario field containing the conversation scenario structure with sentences, highlighted words, and translations
- **Exercise Retrieval Query**: A GraphQL query that fetches exercise data by scenario ID and exercise type
- **Exercise Type**: An enumeration of available exercise types (fillInBlank, matchingPairs, sentenceScramble, swipe)

## Requirements

### Requirement 1

**User Story:** As a language learner, I want fill-in-the-blank exercises automatically generated from scenarios, so that I can practice vocabulary in context

#### Acceptance Criteria

1. WHEN a new item is created in the Scenario Table, THE Exercise Generator Lambda SHALL be triggered via DynamoDB Streams
2. THE Exercise Generator Lambda SHALL extract all target language sentences from the Scenario JSON
3. FOR each target language sentence, THE Exercise Generator Lambda SHALL call the Google AI Service with the difficulty level, source language, and target language parameters to identify one word to remove and generate three incorrect options plus the correct answer
4. THE Exercise Generator Lambda SHALL store the fill-in-the-blank exercise data in a new field named "fillInBlankExercises" in the Scenario Table item
5. THE fill-in-the-blank exercise data SHALL include the sentence with the blank, the correct answer, all four options, and the position of the missing word

### Requirement 2

**User Story:** As a language learner, I want matching pairs exercises automatically generated from scenarios, so that I can practice connecting source and target language sentences

#### Acceptance Criteria

1. THE Exercise Generator Lambda SHALL extract all sentence pairs (both source and target language) from the Scenario JSON
2. THE Exercise Generator Lambda SHALL call the Google AI Service with all sentence pairs, difficulty level, source language, and target language parameters to generate a matching pairs game exercise
3. THE matching pairs exercise SHALL include all source language sentences and their corresponding target language translations in a shuffled order
4. THE Exercise Generator Lambda SHALL store the matching pairs exercise data in a new field named "matchingPairsExercise" in the Scenario Table item
5. THE matching pairs exercise data SHALL include the list of source sentences, the list of target sentences, and the correct pairings

### Requirement 3

**User Story:** As a language learner, I want sentence scramble exercises automatically generated from scenarios, so that I can practice sentence structure and grammar

#### Acceptance Criteria

1. THE Exercise Generator Lambda SHALL extract all sentence pairs from the Scenario JSON for scramble exercise generation
2. FOR each sentence pair, THE Exercise Generator Lambda SHALL call the Google AI Service with the difficulty level, source language, and target language parameters to create a scrambled word list from the target language sentence
3. THE sentence scramble exercise SHALL provide the source language sentence as a reference and the target language words in jumbled order
4. THE Exercise Generator Lambda SHALL store the sentence scramble exercise data in a new field named "sentenceScrambleExercises" in the Scenario Table item
5. THE sentence scramble exercise data SHALL include the source sentence, the scrambled target words array, and the correct word order

### Requirement 4

**User Story:** As a language learner, I want swipe-based translation exercises automatically generated from scenarios, so that I can quickly review vocabulary and phrases

#### Acceptance Criteria

1. THE Exercise Generator Lambda SHALL extract vocabulary and sentence pairs from the Scenario JSON for swipe exercise generation
2. THE Exercise Generator Lambda SHALL call the Google AI Service with the difficulty level, source language, and target language parameters to generate both correct and incorrect translation pairs for the swipe exercise
3. THE swipe exercise SHALL include a mix of correct translations and plausible incorrect translations
4. THE Exercise Generator Lambda SHALL store the swipe exercise data in a new field named "swipeExercise" in the Scenario Table item
5. THE swipe exercise data SHALL include the word or phrase, the potential translation, and a boolean indicating if the translation is correct

### Requirement 5

**User Story:** As a system administrator, I want the exercise generation to handle errors gracefully, so that scenario creation is not blocked by exercise generation failures

#### Acceptance Criteria

1. IF the Google AI Service call fails for any exercise type, THEN THE Exercise Generator Lambda SHALL log the error with context details
2. IF an exercise generation fails, THEN THE Exercise Generator Lambda SHALL continue processing remaining exercise types
3. THE Exercise Generator Lambda SHALL store partial exercise data in the Scenario Table even if some exercise types fail to generate
4. THE Exercise Generator Lambda SHALL retry failed Google AI Service calls up to two times with exponential backoff
5. IF all retry attempts fail for an exercise type, THEN THE Exercise Generator Lambda SHALL store an empty or null value for that exercise field

### Requirement 6

**User Story:** As a system administrator, I want exercise generation to be tracked for usage monitoring, so that I can monitor API costs and performance

#### Acceptance Criteria

1. THE Exercise Generator Lambda SHALL log each Google AI Service call to the GeminiUsageLog table with token counts
2. THE Exercise Generator Lambda SHALL record the feature name as "exercise_generation" in the usage log
3. IF a Google AI Service call fails, THEN THE Exercise Generator Lambda SHALL log the error to the GeminiUsageErrorLog table
4. THE Exercise Generator Lambda SHALL include the scenario ID and exercise type in all log entries
5. THE usage logging SHALL not block or delay the exercise generation process

### Requirement 7

**User Story:** As a language learner, I want to retrieve specific exercises for a scenario, so that I can practice with different exercise types

#### Acceptance Criteria

1. THE system SHALL expose a GraphQL query named "getExerciseForScenario" that accepts scenario ID and exercise type as arguments
2. THE getExerciseForScenario query SHALL return the structured JSON of the requested exercise type from the Scenario Table
3. IF the requested exercise does not exist for the scenario, THEN THE getExerciseForScenario query SHALL return null without throwing an error
4. THE getExerciseForScenario query SHALL support all four exercise types: fillInBlank, matchingPairs, sentenceScramble, and swipe
5. THE getExerciseForScenario query SHALL require authentication to access exercise data
