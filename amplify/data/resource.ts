import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { scenarioGenerator } from '../functions/scenario-generator/resource';
import { pronunciationAssessor } from '../functions/pronunciation-assessor/resource';
import { customTextProcessor } from '../functions/custom-text-processor/resource';
import { usageSummary } from '../functions/usage-summary/resource';
import { exerciseRetriever } from '../functions/exercise-retriever/resource';

const schema = a.schema({

  Scenario: a.model({
    id: a.id().required(),
    topic: a.string().required(),
    difficulty: a.string().required(),
    sourceLang: a.string().required(),
    targetLang: a.string().required(),
    scenarioKey: a.string().required(), // composite key: topic#difficulty#sourceLang#targetLang
    scenario: a.string().required(),
    name: a.string().required(),
    description: a.string().required(),
    difficulty_level: a.string().required(),
    fillInBlankExercises: a.json(),
    matchingPairsExercise: a.json(),
    sentenceScrambleExercises: a.json(),
    swipeExercise: a.json(),
  })
    .identifier(["id"])
    .secondaryIndexes((index) => [
      index("scenarioKey").name("byScenarioKey"),
    ])
    .authorization((allow) => [allow.authenticated()]),

  History: a.model({
    id: a.id().required(),
    userId: a.string().required(),
    scenarioId: a.string().required(), // Reference to the Scenario id
    name: a.string().required(),
    category: a.string(),
    topic: a.string(),
    description: a.string().required(),
    difficulty: a.string().required(),
    createdAt: a.datetime().required(),
  })
    .identifier(["id"])
    .secondaryIndexes((index) => [
      index("userId").name("byUserId"),
    ])
    .authorization((allow) => [allow.authenticated()]),

  GeminiUsageLog: a.model({
    logId: a.id().required(),
    userId: a.string().required(),
    feature: a.string().required(),
    timestamp: a.datetime().required(),
    promptTokenCount: a.integer().required(),
    candidatesTokenCount: a.integer().required(),
    totalTokenCount: a.integer().required(),
    rawUsageMetadata: a.json().required(),
    apiResponseStatus: a.string().required(),
  })
    .identifier(["logId"])
    .secondaryIndexes((index) => [
      index("userId").name("byUserId"),
      index("userId").sortKeys(["feature"]).name("byUserIdAndFeature"),
    ])
    .authorization((allow) => [allow.authenticated()]),

  GeminiUsageErrorLog: a.model({
    errorLogId: a.id().required(),
    userId: a.string(),
    feature: a.string(),
    timestamp: a.datetime().required(),
    errorMessage: a.string().required(),
    errorContext: a.json().required(),
    retryAttempts: a.integer().required(),
  })
    .identifier(["errorLogId"])
    .secondaryIndexes((index) => [
      index("userId").name("byUserId"),
    ])
    .authorization((allow) => [allow.authenticated()]),


  generateScenario: a
    .query()
    .arguments({
      topic: a.string().required(),
      difficulty: a.string().required(),
      sourceLang: a.string().required(),
      targetLang: a.string().required(),
    })
    .returns(a.ref('Scenario'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(scenarioGenerator)),

  assessPronunciation: a
    .query()
    .arguments({
      originalText: a.string().required(),
      userTranscript: a.string().required(),
      language: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(pronunciationAssessor)),

  processCustomText: a
    .query()
    .arguments({
      text: a.string().required(),
      textLanguage: a.string().required(),
      difficulty: a.string().required(),
      sourceLang: a.string().required(),
      targetLang: a.string().required(),
    })
    .returns(a.ref('Scenario'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(customTextProcessor)),

  getGeminiUsageSummary: a
    .query()
    .arguments({
      userId: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(usageSummary)),

  getExerciseForScenario: a
    .query()
    .arguments({
      scenarioId: a.string().required(),
      exerciseType: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(exerciseRetriever)),

});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
