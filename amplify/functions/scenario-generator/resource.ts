import { defineFunction, secret } from '@aws-amplify/backend';
// Wichtig: Der Name des Exports muss 'scenarioGenerator' sein
// und der Pfad muss auf den Handler verweisen.
export const scenarioGenerator = defineFunction({
    // Der Name ist optional, aber nützlich für die Klarheit
    name: 'scenario-generator',
    // Stellt sicher, dass dies auf Ihre Logik-Datei verweist (./handler.ts)
    entry: './handler.ts',
    runtime: 20, // 
    environment: { 
        GEMINI_API_KEY: secret("GEMINI_API_KEY"),
     },
    resourceGroupName: 'data',
    timeoutSeconds: 60, // Erhöhen Sie das Timeout, wenn die Generierung länger dauert
});

