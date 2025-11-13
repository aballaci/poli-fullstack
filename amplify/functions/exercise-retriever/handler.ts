import { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const tableName = process.env.DDB_TABLE_NAME;

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

type ExerciseType = "fillInBlank" | "matchingPairs" | "sentenceScramble" | "swipe";

interface GetExerciseArgs {
    scenarioId: string;
    exerciseType: string;
}

/**
 * Main Lambda handler for retrieving exercises
 */
export const handler: Handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const { scenarioId, exerciseType } = event.arguments as GetExerciseArgs;

    // Validate exercise type
    const validTypes: ExerciseType[] = ["fillInBlank", "matchingPairs", "sentenceScramble", "swipe"];
    if (!validTypes.includes(exerciseType as ExerciseType)) {
        console.error(`Invalid exercise type: ${exerciseType}`);
        return null;
    }

    try {
        // Query Scenario table by ID
        const command = new GetCommand({
            TableName: tableName,
            Key: { id: scenarioId }
        });

        const result = await ddbDocClient.send(command);

        if (!result.Item) {
            console.log(`Scenario not found: ${scenarioId}`);
            return null;
        }

        // Extract the requested exercise field
        const exerciseFieldName = getExerciseFieldName(exerciseType as ExerciseType);
        const exercise = result.Item[exerciseFieldName];

        if (!exercise) {
            console.log(`Exercise ${exerciseType} not found for scenario ${scenarioId}`);
            return null;
        }

        console.log(`Successfully retrieved ${exerciseType} exercise for scenario ${scenarioId}`);
        return exercise;
    } catch (error) {
        console.error("Error retrieving exercise:", error);
        throw error;
    }
};

/**
 * Map exercise type to database field name
 */
function getExerciseFieldName(exerciseType: ExerciseType): string {
    const fieldMap: Record<ExerciseType, string> = {
        fillInBlank: "fillInBlankExercises",
        matchingPairs: "matchingPairsExercise",
        sentenceScramble: "sentenceScrambleExercises",
        swipe: "swipeExercise"
    };

    return fieldMap[exerciseType];
}
