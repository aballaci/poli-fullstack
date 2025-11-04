import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { scenarioGenerator } from '../functions/scenario-generator/resource';
import { pronunciationAssessor } from '../functions/pronunciation-assessor/resource';
import { customTextProcessor } from '../functions/custom-text-processor/resource';

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
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(customTextProcessor)),

});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
