# Design Document

## Overview

This feature implements an automated exercise generation system that creates four types of language learning exercises from conversation scenarios. The system uses AWS Lambda triggered by DynamoDB Streams to process newly created scenarios and calls Google Generative AI to generate contextually appropriate exercises. The exercises are stored back in the Scenario table and can be retrieved via a GraphQL query.

## Architecture

### High-Level Architecture

```
Scenario Creation → DynamoDB Streams → Exercise Generator Lambda → Google AI API
                                                ↓
                                        Update Scenario Table
                                                ↓
                                        Log to GeminiUsageLog
                                                ↓
                                GraphQL Query (getExerciseForScenario)
```

### Components

1. **DynamoDB Stream Trigger**: Captures INSERT events on the Scenario table
2. **Exercise Generator Lambda**: Orchestrates exercise generation for all four types
3. **Google AI Integration**: Generates exercise content using structured prompts
4. **Data Layer**: Updates Scenario table with generated exercises
5. **GraphQL Resolver**: Retrieves exercises by scenario ID and type

## Components and Interfaces

### 1. Exercise Generator Lambda Function

**Location**: `amplify/functions/exercise-generator/`

**Trigger**: DynamoDB Stream on Scenario table (INSERT events only)

**Environment Variables**:
- `GEMINI_API_KEY`: Google AI API key
- `DDB_TABLE_NAME`: Scenario table name
- `GEMINI_USAGE_LOG_TABLE_NAME`: Usage logging table name

**Handler Flow**:
```typescript
1. Receive DynamoDB Stream event
2. Extract scenario data from event record
3. Parse scenario JSON
4. Generate exercises in parallel:
   - Fill-in-the-blank
   - Matching pairs
   - Sentence scramble
   - Swipe exercise
5. Update Scenario table with exercise fields
6. Log usage to GeminiUsageLog
```

### 2. Data Models

#### Fill-in-the-Blank Exercise
```typescript
interface FillInBlankExercise {
  sentenceId: string;
  sentenceWithBlank: string;
  blankPosition: number;
  correctAnswer: string;
  options: string[]; // Array of 4 options (includes correct answer)
  targetLanguage: string;
}

interface FillInBlankExercises {
  exercises: FillInBlankExercise[];
}
```

#### Matching Pairs Exercise
```typescript
interface MatchingPair {
  id: string;
  sourceWord: string;
  targetWord: string;
}

interface MatchingPairsExercise {
  sourceWords: Array<{ id: string; word: string }>;
  targetWords: Array<{ id: string; word: string }>;
  correctPairs: Array<{ sourceId: string; targetId: string }>;
}
```

#### Sentence Scramble Exercise
```typescript
interface SentenceScrambleExercise {
  sentenceId: string;
  sourceText: string;
  scrambledWords: string[];
  correctOrder: number[]; // Indices representing correct order
  targetLanguage: string;
}

interface SentenceScrambleExercises {
  exercises: SentenceScrambleExercise[];
}
```

#### Swipe Exercise
```typescript
interface SwipeCard {
  id: string;
  word: string;
  translation: string;
  isCorrect: boolean;
  sourceLanguage: string;
  targetLanguage: string;
}

interface SwipeExercise {
  cards: SwipeCard[];
}
```

### 3. Scenario Table Schema Updates

Add new fields to the Scenario model:
```typescript
{
  // Existing fields...
  fillInBlankExercises: a.json(),
  matchingPairsExercise: a.json(),
  sentenceScrambleExercises: a.json(),
  swipeExercise: a.json(),
}
```

### 4. Google AI Integration

#### Prompt Strategy

Each exercise type will have a dedicated prompt that includes:
- Difficulty level (CEFR)
- Source language
- Target language
- Scenario sentences
- Specific instructions for exercise format

**Matching Pairs Specific Instructions**:
- Extract individual words from source and target sentences (not full sentences)
- Create word-to-word translation pairs
- Select 8-12 word pairs appropriate for the difficulty level
- Shuffle target words for the game interface
- Focus on vocabulary from highlighted words when available

#### Response Schema

Use Google AI's structured output with JSON schema for each exercise type to ensure consistent formatting.

**Fill-in-the-Blank Schema**:
```typescript
{
  type: "object",
  properties: {
    exercises: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sentenceId: { type: "string" },
          sentenceWithBlank: { type: "string" },
          blankPosition: { type: "number" },
          correctAnswer: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          targetLanguage: { type: "string" }
        }
      }
    }
  }
}
```

Similar schemas will be defined for the other three exercise types.

### 5. GraphQL Query

**Query Definition**:
```typescript
getExerciseForScenario: a
  .query()
  .arguments({
    scenarioId: a.string().required(),
    exerciseType: a.string().required(), // "fillInBlank" | "matchingPairs" | "sentenceScramble" | "swipe"
  })
  .returns(a.json())
  .authorization((allow) => [allow.authenticated()])
  .handler(a.handler.function(exerciseRetriever))
```

**Exercise Retriever Lambda**:
- Queries Scenario table by ID
- Extracts the requested exercise field
- Returns null if exercise doesn't exist
- Returns structured JSON if exercise exists

## Error Handling

### Exercise Generation Failures

1. **Individual Exercise Failure**: If one exercise type fails, continue with others
2. **Retry Logic**: Implement exponential backoff (2 retries max)
3. **Partial Success**: Store successfully generated exercises even if some fail
4. **Error Logging**: Log all failures to GeminiUsageErrorLog with context

### Error Response Structure
```typescript
{
  scenarioId: string;
  exerciseType: string;
  error: string;
  timestamp: string;
  retryAttempts: number;
}
```

### Graceful Degradation

- If all exercises fail, the scenario is still saved (exercises are optional)
- Frontend should check for null/undefined exercise fields
- Display appropriate messaging when exercises are unavailable

## Testing Strategy

### Unit Tests

1. **Exercise Generator Lambda**:
   - Test DynamoDB Stream event parsing
   - Test scenario JSON extraction
   - Test exercise generation for each type
   - Test error handling and retries
   - Test partial failure scenarios

2. **Exercise Retriever Lambda**:
   - Test scenario lookup by ID
   - Test exercise field extraction
   - Test null handling for missing exercises
   - Test invalid exercise type handling

### Integration Tests

1. **End-to-End Flow**:
   - Create a scenario in DynamoDB
   - Verify Lambda is triggered
   - Verify exercises are generated
   - Verify exercises are stored in table
   - Verify exercises can be retrieved via GraphQL

2. **Google AI Integration**:
   - Test with real API calls (limited)
   - Verify response parsing
   - Test error scenarios (rate limits, invalid responses)

### Mock Data

Create sample scenarios with known sentence structures to validate:
- Fill-in-the-blank word selection
- Matching pairs shuffling
- Sentence scramble word ordering
- Swipe card generation (correct/incorrect mix)

## Performance Considerations

### Parallel Processing

Generate all four exercise types in parallel using `Promise.all()` to minimize latency.

### Caching Strategy

Exercises are generated once and stored permanently. No caching layer needed beyond DynamoDB.

### API Rate Limiting

- Implement exponential backoff for Google AI API calls
- Consider batching if multiple scenarios are created simultaneously
- Monitor usage logs to stay within API quotas

## Security Considerations

1. **API Key Management**: Store GEMINI_API_KEY in AWS Secrets Manager or environment variables
2. **Authentication**: All GraphQL queries require authentication
3. **Data Validation**: Validate scenario JSON structure before processing
4. **Input Sanitization**: Sanitize user-generated content before sending to Google AI

## Deployment Strategy

1. **Phase 1**: Deploy Lambda function with DynamoDB Stream trigger
2. **Phase 2**: Update Scenario table schema with new exercise fields
3. **Phase 3**: Deploy GraphQL resolver for exercise retrieval
4. **Phase 4**: Monitor logs and adjust prompts based on exercise quality

## Monitoring and Observability

### Metrics to Track

- Exercise generation success rate per type
- Average generation time per exercise type
- Google AI API token usage
- Error rates and types
- Lambda execution duration

### CloudWatch Alarms

- High error rate (>10% failures)
- Lambda timeout threshold
- DynamoDB throttling
- Google AI API quota approaching limit

### Logging

- Log all Google AI API calls with request/response
- Log exercise generation start/completion
- Log all errors with full context
- Use structured logging (JSON format)
