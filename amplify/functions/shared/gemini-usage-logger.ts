import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

// Gemini 2.5 Flash pricing (per 1M tokens) - configurable via environment
const DEFAULT_INPUT_PRICE_PER_MILLION = 0.075; // $0.075 per 1M input tokens
const DEFAULT_OUTPUT_PRICE_PER_MILLION = 0.30; // $0.30 per 1M output tokens

const INPUT_PRICE_PER_MILLION = parseFloat(process.env.GEMINI_INPUT_PRICE_PER_MILLION || String(DEFAULT_INPUT_PRICE_PER_MILLION));
const OUTPUT_PRICE_PER_MILLION = parseFloat(process.env.GEMINI_OUTPUT_PRICE_PER_MILLION || String(DEFAULT_OUTPUT_PRICE_PER_MILLION));

interface UsageMetadata {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    [key: string]: any; // Allow additional fields
}

interface LambdaEvent {
    identity?: {
        claims?: {
            sub?: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
    requestContext?: {
        identity?: {
            sub?: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
    [key: string]: any;
}

/**
 * Extract user ID from Lambda event
 */
export function extractUserId(event: LambdaEvent): string {
    // Try identity.claims.sub first (common in Amplify AppSync resolvers)
    const userIdFromIdentity = event.identity?.claims?.sub;
    if (userIdFromIdentity) {
        return userIdFromIdentity;
    }

    // Try requestContext.identity.sub (alternative location)
    const userIdFromContext = event.requestContext?.identity?.sub;
    if (userIdFromContext) {
        return userIdFromContext;
    }

    // Fallback to missing-user if no user info available
    return "missing-user";
}

/**
 * Determine feature name from Lambda function name or context
 */
export function determineFeatureName(functionName: string | undefined, event: LambdaEvent): string {
    if (!functionName) {
        // Try to extract from event context if available
        const contextFunctionName = event.requestContext?.functionName || 
                                    event.identity?.sourceIp || 
                                    "unknown";
        return mapFunctionNameToFeature(contextFunctionName);
    }
    
    return mapFunctionNameToFeature(functionName);
}

/**
 * Map Lambda function name to feature name
 */
function mapFunctionNameToFeature(functionName: string): string {
    const normalized = functionName.toLowerCase();
    
    if (normalized.includes('scenario-generator') || normalized.includes('scenariogenerator')) {
        return "scenario_generation";
    }
    if (normalized.includes('pronunciation-assessor') || normalized.includes('pronunciationassessor')) {
        return "pronunciation_evaluation";
    }
    if (normalized.includes('custom-text-processor') || normalized.includes('customtextprocessor')) {
        return "custom_text_generation";
    }
    
    // Dynamic fallback: extract feature name from function name
    // This allows new features to be tracked automatically
    const parts = normalized.split('-');
    if (parts.length > 1) {
        return parts.join('_');
    }
    
    return normalized.replace(/[^a-z0-9]/g, '_');
}

/**
 * Extract usage metadata from Gemini API response
 */
export function extractUsageMetadata(response: any): UsageMetadata | null {
    // Check for usageMetadata in the response
    if (response?.usageMetadata) {
        return {
            promptTokenCount: response.usageMetadata.promptTokenCount || 0,
            candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
            totalTokenCount: response.usageMetadata.totalTokenCount || 0,
            ...response.usageMetadata, // Include all fields
        };
    }
    
    // Fallback: check for alternative response structures
    if (response?.usage) {
        return {
            promptTokenCount: response.usage.promptTokenCount || 0,
            candidatesTokenCount: response.usage.candidatesTokenCount || 0,
            totalTokenCount: response.usage.totalTokenCount || 0,
            ...response.usage,
        };
    }
    
    // If no usage metadata found, return null (will be logged with 0 tokens)
    console.warn("No usage metadata found in Gemini response");
    return null;
}

/**
 * Calculate cost based on token counts
 */
export function calculateCost(promptTokenCount: number, candidatesTokenCount: number): number {
    const inputCost = (promptTokenCount / 1_000_000) * INPUT_PRICE_PER_MILLION;
    const outputCost = (candidatesTokenCount / 1_000_000) * OUTPUT_PRICE_PER_MILLION;
    return inputCost + outputCost;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log usage to DynamoDB with retry logic
 */
export async function logUsage(
    tableName: string,
    userId: string,
    feature: string,
    usageMetadata: UsageMetadata | null,
    apiResponseStatus: string = "success"
): Promise<void> {
    const promptTokenCount = usageMetadata?.promptTokenCount || 0;
    const candidatesTokenCount = usageMetadata?.candidatesTokenCount || 0;
    const totalTokenCount = usageMetadata?.totalTokenCount || (promptTokenCount + candidatesTokenCount);
    
    const logEntry = {
        logId: uuidv4(),
        userId,
        feature,
        timestamp: new Date().toISOString(),
        promptTokenCount,
        candidatesTokenCount,
        totalTokenCount,
        rawUsageMetadata: usageMetadata || {},
        apiResponseStatus,
    };

    const ddbClient = new DynamoDBClient({});
    const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

    let lastError: Error | null = null;
    
    // Retry up to 3 times with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const command = new PutCommand({
                TableName: tableName,
                Item: logEntry,
            });
            
            await ddbDocClient.send(command);
            console.log(`✅ Successfully logged usage for user ${userId}, feature ${feature} on attempt ${attempt}`);
            return; // Success, exit retry loop
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`❌ Failed to log usage (attempt ${attempt}/3):`, lastError.message);
            
            if (attempt < 3) {
                // Exponential backoff: 100ms, 200ms, 400ms
                const delayMs = 100 * Math.pow(2, attempt - 1);
                await sleep(delayMs);
            }
        }
    }

    // All retries failed, log to error table
    // Error table name should be passed as a separate parameter or environment variable
    const errorTableName = process.env.GEMINI_USAGE_ERROR_TABLE_NAME || tableName.replace('GeminiUsageLog', 'GeminiUsageErrorLog');
    await logUsageError(errorTableName, userId, feature, lastError!, logEntry);
}

/**
 * Log usage error to error log table after all retries failed
 */
async function logUsageError(
    errorTableName: string,
    userId: string,
    feature: string,
    error: Error,
    context: any
): Promise<void> {
    const ddbClient = new DynamoDBClient({});
    const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

    const errorLogEntry = {
        errorLogId: uuidv4(),
        userId: userId || "missing-user",
        feature: feature || "unknown",
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        errorContext: {
            ...context,
            errorStack: error.stack,
            errorName: error.name,
        },
        retryAttempts: 3,
    };

    try {
        const command = new PutCommand({
            TableName: errorTableName,
            Item: errorLogEntry,
        });
        
        await ddbDocClient.send(command);
        console.log(`✅ Logged usage error to error table for investigation`);
    } catch (errorLogError) {
        // If we can't even log the error, just console.error it
        console.error("❌ CRITICAL: Failed to log usage error to error table:", errorLogError);
        console.error("Original error context:", JSON.stringify(errorLogEntry, null, 2));
    }
}

/**
 * Main function to log Gemini API usage
 * Call this after a successful Gemini API call
 */
export async function logGeminiUsage(
    tableName: string,
    event: LambdaEvent,
    response: any,
    featureName?: string,
    apiResponseStatus: string = "success"
): Promise<void> {
    const userId = extractUserId(event);
    const feature = featureName || determineFeatureName(process.env.AWS_LAMBDA_FUNCTION_NAME, event);
    const usageMetadata = extractUsageMetadata(response);

    await logUsage(tableName, userId, feature, usageMetadata, apiResponseStatus);
}

