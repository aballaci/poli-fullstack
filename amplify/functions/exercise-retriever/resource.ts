import { defineFunction } from '@aws-amplify/backend';

export const exerciseRetriever = defineFunction({
    name: 'exercise-retriever',
    entry: './handler.ts',
    runtime: 20,
    resourceGroupName: 'data',
    timeoutSeconds: 30,
});
