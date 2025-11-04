import { defineFunction, secret } from '@aws-amplify/backend';

export const pronunciationAssessor = defineFunction({
    name: 'pronunciation-assessor',
    entry: './handler.ts',
    runtime: 20,
    environment: { 
        GEMINI_API_KEY: secret("GEMINI_API_KEY"),
    },
    resourceGroupName: 'data',
    timeoutSeconds: 30,
});

