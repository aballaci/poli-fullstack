import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { scenarioGenerator } from '../functions/scenario-generator/resource';

const schema = a.schema({

    Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

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
    .authorization((allow) => [allow.owner()]),


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

});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
