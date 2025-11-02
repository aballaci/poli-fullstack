import { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { scenarioSchema } from "./schema.js";
import { ConversationScenario } from "./models.js";

import { Type } from "@google/genai";

// 2. Import the client from the node-specific path to avoid the 'Window is undefined' error.
import { GoogleGenAI } from "@google/genai/node";
import { Schema } from "../../data/resource.js";
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';



type ScenarioInput = {
    topic: string;
    difficulty: string;
    sourceLang: string;
    targetLang: string;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const tableName = process.env.DDB_TABLE_NAME; // Get table name from environment
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

console.log("##### tableName:", tableName);

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// The function you provided for Gemini generation
async function callGemini(input: ScenarioInput): Promise<ConversationScenario> {
    const { topic, difficulty, sourceLang, targetLang } = input;

    const modelName = "gemini-2.5-flash";


    const prompt = `Generate a language learning conversation scenario.
    The user's native language is ${sourceLang}.
    They are learning ${targetLang} at a ${difficulty} CEFR level.
    The topic is "${topic}".
    Provide a name for the scenario, a short description, and 5 to 7 sentence pairs.
    For each sentence in both the source and target language, identify 1 or 2 important vocabulary words appropriate for the difficulty level.
    For each highlighted word, provide a translation into the other language and two example sentences in the language of the highlighted word.
    The response must be a valid JSON object matching the provided schema.
    Ensure all text fields are populated and not empty. The 'source' text should be in ${sourceLang} and the 'target' text in ${targetLang}.`;


    // console.log("Calling Gemini with prompt:", prompt);

    // console.log("Using scenarioSchema:", JSON.stringify(scenarioSchema, null, 2));

    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,  // Replace with dynamic prompt from event
        config: {
            responseMimeType: "application/json",
            responseSchema: scenarioSchema  // Your schema object
        },
    });
    // Check for empty text and re-create the error logic
    let rawText: string | undefined;

    // 💡 Lambda/Node Environment Parsing: Check the deep structure first.
    // This path is reliable for the Node SDK's full response object.
    const deepText = response.candidates?.[0]?.content?.parts?.[0]?.text;

    // 💡 Frontend/Browser Environment Parsing (Fallback/Simpler Check):
    // Use this as a fallback for maximum compatibility, although deepText should be primary.
    const topLevelText = (response as any).text;

    // Use the deep text if it exists, otherwise fall back to the top-level text.
    rawText = deepText || topLevelText;

    if (!rawText || typeof rawText !== "string") {
        throw new Error("Failed to extract raw text from Gemini response (text was empty or not found).");
    }

    let scenario: ConversationScenario;
    try {
        // 2. JSON Cleanup (Still recommended, even if the model is usually clean)
        const cleanedText = rawText
            .trim()
            .replace(/^```json\s*/, '')
            .replace(/```\s*$/, '');

        scenario = JSON.parse(cleanedText) as ConversationScenario;

    } catch (err) {
        console.error("JSON Parsing Error:", (err as Error).message, "Raw excerpt:", rawText.substring(0, 200) + '...');
        throw new Error("Failed to parse Gemini response as JSON.");
    }
    // return the parsed scenario object
    console.log("✅ Parsed Scenario:", JSON.stringify(scenario, null, 2));

    // Combine input with generated data for the DB model
    return scenario;
}

// Function to save the generated scenario to DynamoDB
async function saveScenario(input: ScenarioInput, scenario: ConversationScenario): Promise<void> {
    const command = new PutCommand({
        TableName: tableName!,
        Item: toScenarioDBModel(input, scenario),
    });
    await ddbDocClient.send(command);
}

// Function to query the database
async function queryDatabase(input: ScenarioInput): Promise<Schema["Scenario"] | undefined> {
    console.log("Querying database with input:", input);

    const key = `${input.topic}#${input.difficulty}#${input.sourceLang}#${input.targetLang}`;
    const queryCommand = new QueryCommand({
        TableName: tableName!,
        IndexName: "byScenarioKey",
        KeyConditionExpression: "scenarioKey = :k",
        ExpressionAttributeValues: { ":k": key },
    });

    try {
        const result = await ddbClient.send(queryCommand);
        console.log("Query Result:", result);
        if (result.Items && result.Items.length > 0) {
            const item = result.Items[0]; 
            return item as Schema["Scenario"];
        }
        return undefined;
    } catch (error) {
        console.error('Scan Error:', error);
        throw error;
    }
}

// Main Lambda Handler for the GraphQL Resolver
export const handler: Handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    const { topic, difficulty, sourceLang, targetLang } = event.arguments;

    // Build a typed, reusable object
    const input: ScenarioInput = {
        topic,
        difficulty,
        sourceLang,
        targetLang,
    };

    // 1. RANDOMIZED CHECK (70% DB, 30% Gemini)
    const isGeminiCall = Math.random() < 0.3;

    if (isGeminiCall) {
        console.log("Decision: Calling Gemini (30% chance)");
    } else {
        console.log("Decision: Querying Database (70% chance)");
        const dbResult = await queryDatabase({ topic, difficulty, sourceLang, targetLang });
        if (dbResult) {
            console.log("Database result found and returned.");
            return dbResult;
        }
        // Fall through to the DB check, as the initial 70% query failed to find a match
        console.log("Database query failed to find a match. Falling through to full DB check.");
    }


    // 2. DB FALLBACK/FULL CHECK
    // If we decided to call Gemini OR the initial DB query failed,
    // we first check if there are ANY results in the DB for the given parameters.
    // This is the "if there are not enough results in the database that match the query" logic.
    // Note: For true "enough" logic, you'd query for all and check count. Here we check for at least one.
    const dbFallbackResult: Schema["Scenario"] | undefined = await queryDatabase(input);

    if (dbFallbackResult) {
        // If a result is found in the DB (even after a 30% call to Gemini was made),
        // we still return the DB result to prevent unnecessary duplicate generation,
        // UNLESS the Gemini call was specifically chosen.
        // Since the logic allows a 30% call to Gemini to generate new content, we proceed
        // to the generation step if that was the random decision.

        // A cleaner approach for the "if there are not enough results" requirement:
        // If we are here, and a result was found, it means the initial 70% query failed,
        // but the full check passed. Let's assume for this logic, we only call Gemini
        // if the query returns nothing.

        if (!isGeminiCall) {
            // Only return if we didn't explicitly choose the 30% Gemini path
            console.log("Database fallback successful. Returning DB result.");
            return dbFallbackResult;
        }
    }


    // 3. GENERATE AND SAVE (Gemini Call)
    console.log("Generating new scenario via Gemini...");
    try {
        const newScenario = await callGemini(input);
        await saveScenario(input, newScenario);
        console.log("New scenario saved to DynamoDB.");
        return toScenarioDBModel(input, newScenario);
    } catch (error) {
        console.error("Critical: Failed to generate or save scenario.", error);
        // As a last resort, if Gemini fails, try to fetch any existing data
        if (dbFallbackResult) return dbFallbackResult;

        throw error;
    }


}

function toScenarioDBModel(input: ScenarioInput, conversation: ConversationScenario) {
    const compositeKey = `${input.topic}#${input.difficulty}#${input.sourceLang}#${input.targetLang}`;
    return {
        id: uuidv4(),
        topic: input.topic,
        difficulty: input.difficulty,
        sourceLang: input.sourceLang,
        targetLang: input.targetLang,
        scenarioKey: compositeKey,
        scenario: JSON.stringify(conversation),
        name: conversation.name,
        description: conversation.description,
        difficulty_level: conversation.difficulty_level,
    };
}