import { DynamoDBStreamHandler, DynamoDBRecord } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { ConversationScenario } from "../scenario-generator/models.js";
import { PromptContext } from "./prompt-builder.js";
import {
    generateFillInBlankExercises,
    generateMatchingPairsExercise,
    generateSentenceScrambleExercises,
    generateSwipeExercise
} from "./exercise-generators.js";
import { logGeminiUsage } from "../shared/gemini-usage-logger.js";

const tableName = process.env.DDB_TABLE_NAME;
const usageLogTableName = process.env.GEMINI_USAGE_LOG_TABLE_NAME || "";

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

interface ScenarioRecord {
    id: string;
    scenario: string;
    difficulty: string;
    sourceLang: string;
    targetLang: string;
}

/**
 * Main Lambda handler for DynamoDB Stream events
 */
export const handler: DynamoDBStreamHandler = async (event) => {
    console.log("Received DynamoDB Stream event:", JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        // Only process INSERT events
        if (record.eventName !== "INSERT") {
            console.log(`Skipping ${record.eventName} event`);
            continue;
        }

        try {
            await processScenarioRecord(record);
        } catch (error) {
            console.error("Error processing record:", error);
            // Continue processing other records even if one fails
        }
    }
};

/**
 * Process a single DynamoDB Stream record
 */
async function processScenarioRecord(record: DynamoDBRecord): Promise<void> {
    if (!record.dynamodb?.NewImage) {
        console.log("No NewImage in record, skipping");
        return;
    }

    // Extract scenario data from the stream record
    const scenarioData = unmarshall(record.dynamodb.NewImage) as ScenarioRecord;
    console.log("Processing scenario:", scenarioData.id);

    // Parse the scenario JSON
    let scenario: ConversationScenario;
    try {
        scenario = JSON.parse(scenarioData.scenario);
    } catch (error) {
        console.error("Failed to parse scenario JSON:", error);
        return;
    }

    // Build context for exercise generation
    const context: PromptContext = {
        difficulty: scenarioData.difficulty,
        sourceLang: scenarioData.sourceLang,
        targetLang: scenarioData.targetLang
    };

    // Generate all exercises in parallel
    const exercises = await generateAllExercises(scenario, context, scenarioData.id);

    // Update the Scenario table with generated exercises
    await updateScenarioWithExercises(scenarioData.id, exercises);

    console.log(`Successfully generated exercises for scenario ${scenarioData.id}`);
}

/**
 * Generate all four exercise types in parallel
 */
async function generateAllExercises(
    scenario: ConversationScenario,
    context: PromptContext,
    scenarioId: string
) {
    const results = await Promise.allSettled([
        generateExerciseWithLogging("fillInBlank", () => generateFillInBlankExercises(scenario, context), scenarioId),
        generateExerciseWithLogging("matchingPairs", () => generateMatchingPairsExercise(scenario, context), scenarioId),
        generateExerciseWithLogging("sentenceScramble", () => generateSentenceScrambleExercises(scenario, context), scenarioId),
        generateExerciseWithLogging("swipe", () => generateSwipeExercise(scenario, context), scenarioId)
    ]);

    return {
        fillInBlankExercises: getResultValue(results[0]),
        matchingPairsExercise: getResultValue(results[1]),
        sentenceScrambleExercises: getResultValue(results[2]),
        swipeExercise: getResultValue(results[3])
    };
}

/**
 * Generate an exercise with usage logging
 */
async function generateExerciseWithLogging<T>(
    exerciseType: string,
    generator: () => Promise<{ data: T; response: any }>,
    scenarioId: string
): Promise<T | null> {
    try {
        console.log(`Generating ${exerciseType} exercise...`);
        const result = await generator();

        // Log usage
        if (usageLogTableName) {
            try {
                await logGeminiUsage(
                    usageLogTableName,
                    { scenarioId, exerciseType }, // event context
                    result.response,
                    "exercise_generation",
                    "success"
                );
            } catch (logError) {
                console.error(`Failed to log usage for ${exerciseType}:`, logError);
            }
        }

        console.log(`✅ Successfully generated ${exerciseType} exercise`);
        return result.data;
    } catch (error) {
        console.error(`❌ Failed to generate ${exerciseType} exercise:`, error);

        // Log error
        if (usageLogTableName) {
            try {
                await logGeminiUsage(
                    usageLogTableName,
                    { scenarioId, exerciseType },
                    null,
                    "exercise_generation",
                    "error",
                    error as Error
                );
            } catch (logError) {
                console.error(`Failed to log error for ${exerciseType}:`, logError);
            }
        }

        return null;
    }
}

/**
 * Extract value from Promise.allSettled result
 */
function getResultValue<T>(result: PromiseSettledResult<T | null>): T | null {
    if (result.status === "fulfilled") {
        return result.value;
    }
    return null;
}

/**
 * Update Scenario table with generated exercises
 */
async function updateScenarioWithExercises(
    scenarioId: string,
    exercises: {
        fillInBlankExercises: any;
        matchingPairsExercise: any;
        sentenceScrambleExercises: any;
        swipeExercise: any;
    }
): Promise<void> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression for non-null exercises
    if (exercises.fillInBlankExercises !== null) {
        updateExpression.push("#fib = :fib");
        expressionAttributeNames["#fib"] = "fillInBlankExercises";
        expressionAttributeValues[":fib"] = exercises.fillInBlankExercises;
    }

    if (exercises.matchingPairsExercise !== null) {
        updateExpression.push("#mp = :mp");
        expressionAttributeNames["#mp"] = "matchingPairsExercise";
        expressionAttributeValues[":mp"] = exercises.matchingPairsExercise;
    }

    if (exercises.sentenceScrambleExercises !== null) {
        updateExpression.push("#ss = :ss");
        expressionAttributeNames["#ss"] = "sentenceScrambleExercises";
        expressionAttributeValues[":ss"] = exercises.sentenceScrambleExercises;
    }

    if (exercises.swipeExercise !== null) {
        updateExpression.push("#sw = :sw");
        expressionAttributeNames["#sw"] = "swipeExercise";
        expressionAttributeValues[":sw"] = exercises.swipeExercise;
    }

    // Only update if at least one exercise was generated
    if (updateExpression.length === 0) {
        console.log("No exercises to update");
        return;
    }

    const command = new UpdateCommand({
        TableName: tableName,
        Key: { id: scenarioId },
        UpdateExpression: `SET ${updateExpression.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    });

    await ddbDocClient.send(command);
    console.log(`Updated scenario ${scenarioId} with exercises`);
}
