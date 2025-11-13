# Implementation Plan

- [x] 1. Update Scenario table schema with exercise fields


  - Add four new JSON fields to the Scenario model in `amplify/data/resource.ts`: fillInBlankExercises, matchingPairsExercise, sentenceScrambleExercises, swipeExercise
  - Each field should be optional (nullable) to handle cases where exercises haven't been generated yet
  - _Requirements: 1.4, 2.4, 3.4, 4.4_

- [x] 2. Create exercise data models and schemas

  - [x] 2.1 Create TypeScript interfaces for all exercise types


    - Create `amplify/functions/exercise-generator/models.ts` with interfaces for FillInBlankExercise, MatchingPairsExercise, SentenceScrambleExercise, and SwipeExercise
    - Include all necessary fields as specified in the design document
    - _Requirements: 1.5, 2.5, 3.5, 4.5_
  
  - [x] 2.2 Create Google AI response schemas for structured output


    - Create `amplify/functions/exercise-generator/schemas.ts` with JSON schemas for each exercise type
    - Define schemas compatible with Google AI's structured output format
    - _Requirements: 1.3, 2.2, 3.2, 4.2_

- [x] 3. Implement Exercise Generator Lambda function

  - [x] 3.1 Create Lambda function structure and configuration


    - Create `amplify/functions/exercise-generator/resource.ts` to define the Lambda function with DynamoDB Stream trigger
    - Configure environment variables (GEMINI_API_KEY, DDB_TABLE_NAME, GEMINI_USAGE_LOG_TABLE_NAME)
    - Set up IAM permissions for DynamoDB read/write and Secrets Manager access
    - _Requirements: 1.1, 5.1_
  
  - [x] 3.2 Implement DynamoDB Stream event handler


    - Create `amplify/functions/exercise-generator/handler.ts` with main handler function
    - Parse DynamoDB Stream events and filter for INSERT operations only
    - Extract scenario data from the event record
    - Parse the scenario JSON field
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.3 Implement fill-in-the-blank exercise generator


    - Create function `generateFillInBlankExercises()` that extracts target language sentences
    - Build prompt with difficulty level, source language, target language, and sentences
    - Call Google AI API with structured schema for fill-in-the-blank format
    - Parse response and return FillInBlankExercises object
    - _Requirements: 1.2, 1.3, 1.5_
  
  - [x] 3.4 Implement matching pairs exercise generator

    - Create function `generateMatchingPairsExercise()` that extracts all sentence pairs
    - Build prompt with difficulty level, languages, and all sentence pairs
    - Call Google AI API with structured schema for matching pairs format
    - Parse response and return MatchingPairsExercise object
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  
  - [x] 3.5 Implement sentence scramble exercise generator

    - Create function `generateSentenceScrambleExercises()` that extracts sentence pairs
    - Build prompt with difficulty level, languages, and sentences
    - Call Google AI API with structured schema for sentence scramble format
    - Parse response and return SentenceScrambleExercises object
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [x] 3.6 Implement swipe exercise generator

    - Create function `generateSwipeExercise()` that extracts vocabulary and sentences
    - Build prompt with difficulty level, languages, and content for correct/incorrect pairs
    - Call Google AI API with structured schema for swipe exercise format
    - Parse response and return SwipeExercise object
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [x] 3.7 Implement parallel exercise generation orchestration

    - Create main orchestration function that calls all four exercise generators in parallel using Promise.allSettled()
    - Handle partial failures by storing successfully generated exercises
    - Collect results and prepare update object for DynamoDB
    - _Requirements: 5.2, 5.3_
  

  - [x] 3.8 Implement DynamoDB update logic

    - Create function to update Scenario table with generated exercises
    - Use UpdateCommand to add exercise fields to the existing scenario item
    - Handle cases where some exercises are null due to generation failures
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 5.3_
  
  - [x] 3.9 Implement error handling and retry logic

    - Add try-catch blocks around each Google AI API call
    - Implement exponential backoff retry logic (max 2 retries)
    - Log errors to GeminiUsageErrorLog table with context
    - Ensure Lambda continues processing even if individual exercises fail
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  


  - [x] 3.10 Implement usage logging integration

    - Import and use the shared `logGeminiUsage` function from `amplify/functions/shared/gemini-usage-logger.ts`
    - Log each Google AI API call with token counts to GeminiUsageLog table
    - Set feature name as "exercise_generation"
    - Include scenario ID and exercise type in log context
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Create Exercise Retriever Lambda function

  - [x] 4.1 Create Lambda function structure


    - Create `amplify/functions/exercise-retriever/resource.ts` to define the Lambda function
    - Configure environment variables (DDB_TABLE_NAME)
    - Set up IAM permissions for DynamoDB read access
    - _Requirements: 7.1_
  
  - [x] 4.2 Implement exercise retrieval handler


    - Create `amplify/functions/exercise-retriever/handler.ts` with main handler function
    - Parse scenarioId and exerciseType from GraphQL arguments
    - Query Scenario table by ID using GetCommand
    - Extract the requested exercise field based on exerciseType
    - Return null if scenario doesn't exist or exercise field is empty
    - Return structured JSON if exercise exists
    - _Requirements: 7.2, 7.3, 7.4_

- [x] 5. Add GraphQL query for exercise retrieval


  - Update `amplify/data/resource.ts` to add the getExerciseForScenario query
  - Define query arguments (scenarioId: string, exerciseType: string)
  - Set return type as a.json()
  - Configure authentication requirement
  - Wire up the exercise-retriever Lambda as the handler
  - _Requirements: 7.1, 7.5_

- [x] 6. Configure DynamoDB Stream trigger



  - Update `amplify/backend.ts` to enable DynamoDB Streams on the Scenario table
  - Configure the stream to capture INSERT events only
  - Connect the exercise-generator Lambda to the stream trigger
  - Set appropriate batch size and retry configuration
  - _Requirements: 1.1_

- [x] 7. Create shared utilities for exercise generation

  - [x] 7.1 Create Google AI client wrapper


    - Create `amplify/functions/exercise-generator/gemini-client.ts` with reusable Google AI client initialization
    - Implement helper function for structured content generation
    - Add error handling and response parsing utilities
    - _Requirements: 1.3, 2.2, 3.2, 4.2_
  
  - [x] 7.2 Create prompt builder utilities


    - Create `amplify/functions/exercise-generator/prompt-builder.ts` with functions to build prompts for each exercise type
    - Include difficulty level, languages, and content in each prompt
    - Ensure prompts are clear and produce consistent results
    - _Requirements: 1.3, 2.2, 3.2, 4.2_
