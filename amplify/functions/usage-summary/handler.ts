import { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { calculateCost } from "../shared/gemini-usage-logger.js";

const usageLogTableName = process.env.GEMINI_USAGE_LOG_TABLE_NAME || "";
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

interface UsageLogEntry {
    logId: string;
    userId: string;
    feature: string;
    timestamp: string;
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    rawUsageMetadata: any;
    apiResponseStatus: string;
}

interface FeatureSummary {
    feature: string;
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
}

interface UserSummary {
    userId: string;
    features: FeatureSummary[];
    overallTotalCost: number;
}

export const handler: Handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    
    const userIdFilter = event.arguments?.userId || null;
    
    if (!usageLogTableName) {
        throw new Error("GEMINI_USAGE_LOG_TABLE_NAME environment variable is not set");
    }

    try {
        // Query all usage logs (or filter by userId if provided)
        const usageLogs = await fetchUsageLogs(userIdFilter);
        
        // Group by userId and feature, then aggregate
        const summaries = aggregateUsageLogs(usageLogs);
        
        // Sort: by userId, then features alphabetically
        const sortedSummaries = summaries.sort((a, b) => {
            if (a.userId !== b.userId) {
                return a.userId.localeCompare(b.userId);
            }
            return 0;
        });
        
        // Sort features within each user alphabetically
        sortedSummaries.forEach(summary => {
            summary.features.sort((a, b) => a.feature.localeCompare(b.feature));
        });
        
        console.log(`✅ Generated usage summary for ${sortedSummaries.length} users`);
        
        return sortedSummaries;
    } catch (error) {
        console.error("Error generating usage summary:", error);
        throw new Error(`Failed to generate usage summary: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Fetch usage logs from DynamoDB
 */
async function fetchUsageLogs(userIdFilter: string | null): Promise<UsageLogEntry[]> {
    const allLogs: UsageLogEntry[] = [];
    
    if (userIdFilter) {
        // Query by userId using GSI
        let lastEvaluatedKey: any = undefined;
        
        do {
            const queryCommand = new QueryCommand({
                TableName: usageLogTableName,
                IndexName: "byUserId",
                KeyConditionExpression: "userId = :userId",
                ExpressionAttributeValues: {
                    ":userId": userIdFilter,
                },
                ExclusiveStartKey: lastEvaluatedKey,
            });
            
            const result = await ddbDocClient.send(queryCommand);
            
            if (result.Items) {
                allLogs.push(...(result.Items as UsageLogEntry[]));
            }
            
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);
    } else {
        // Scan all logs (for admin summary)
        let lastEvaluatedKey: any = undefined;
        
        do {
            const scanCommand = new ScanCommand({
                TableName: usageLogTableName,
                ExclusiveStartKey: lastEvaluatedKey,
            });
            
            const result = await ddbDocClient.send(scanCommand);
            
            if (result.Items) {
                allLogs.push(...(result.Items as UsageLogEntry[]));
            }
            
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);
    }
    
    return allLogs;
}

/**
 * Aggregate usage logs by userId and feature
 */
function aggregateUsageLogs(logs: UsageLogEntry[]): UserSummary[] {
    // Group by userId, then by feature
    const userMap = new Map<string, Map<string, FeatureSummary>>();
    
    for (const log of logs) {
        // Initialize user map if needed
        if (!userMap.has(log.userId)) {
            userMap.set(log.userId, new Map<string, FeatureSummary>());
        }
        
        const featureMap = userMap.get(log.userId)!;
        
        // Initialize feature summary if needed
        if (!featureMap.has(log.feature)) {
            featureMap.set(log.feature, {
                feature: log.feature,
                totalCalls: 0,
                totalTokens: 0,
                totalCost: 0,
            });
        }
        
        const featureSummary = featureMap.get(log.feature)!;
        
        // Aggregate data
        featureSummary.totalCalls += 1;
        featureSummary.totalTokens += log.totalTokenCount;
        featureSummary.totalCost += calculateCost(log.promptTokenCount, log.candidatesTokenCount);
    }
    
    // Convert maps to arrays
    const summaries: UserSummary[] = [];
    
    for (const [userId, featureMap] of userMap.entries()) {
        const features = Array.from(featureMap.values());
        
        const overallTotalCost = features.reduce((sum, f) => sum + f.totalCost, 0);
        
        summaries.push({
            userId,
            features,
            overallTotalCost,
        });
    }
    
    return summaries;
}

