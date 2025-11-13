import { defineFunction, secret } from '@aws-amplify/backend';

export const exerciseGenerator = defineFunction({
    name: 'exercise-generator',
    entry: './handler.ts',
    runtime: 20,
    environment: {
        GEMINI_API_KEY: secret("GEMINI_API_KEY"),
    },
    resourceGroupName: 'data',
    timeoutSeconds: 120, // Longer timeout for generating multiple exercises
});
