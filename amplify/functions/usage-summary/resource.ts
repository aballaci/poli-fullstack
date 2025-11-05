import { defineFunction } from '@aws-amplify/backend';

export const usageSummary = defineFunction({
    name: 'usage-summary',
    entry: './handler.ts',
    runtime: 20,
    resourceGroupName: 'data',
    timeoutSeconds: 60,
});

