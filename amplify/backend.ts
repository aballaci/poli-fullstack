import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource.js';
import { auth } from './auth/resource.js';
import { poliAssets } from './storage/resource.js';
import { scenarioGenerator } from './functions/scenario-generator/resource.js';
import { pronunciationAssessor } from './functions/pronunciation-assessor/resource.js';
import { customTextProcessor } from './functions/custom-text-processor/resource.js';
import { usageSummary } from './functions/usage-summary/resource.js';
import { exerciseGenerator } from './functions/exercise-generator/resource.js';
import { exerciseRetriever } from './functions/exercise-retriever/resource.js';

import { Effect, PolicyStatement, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CfnBucket } from 'aws-cdk-lib/aws-s3';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

// 1. DEFINE THE BACKEND
// =============================================
const backend = defineBackend({
  auth,
  data,
  poliAssets,
  scenarioGenerator,
  pronunciationAssessor,
  customTextProcessor,
  usageSummary,
  exerciseGenerator,
  exerciseRetriever,
});

// 2. GET RESOURCE HANDLES
// =============================================
// Get L3 Function constructs (for adding env vars)
const {
  scenarioGenerator: scenarioGenFunc,
  customTextProcessor: customTextFunc,
  pronunciationAssessor: pronunciationFunc,
  usageSummary: usageSummaryFunc,
  exerciseGenerator: exerciseGenFunc,
  exerciseRetriever: exerciseRetFunc,
} = backend;

// Get L2 Lambda functions (for attaching policies)
const scenarioLambda = scenarioGenFunc.resources.lambda;
const customTextProcessorLambda = customTextFunc.resources.lambda;
const pronunciationAssessorLambda = pronunciationFunc.resources.lambda;
const usageSummaryLambda = usageSummaryFunc.resources.lambda;
const exerciseGeneratorLambda = exerciseGenFunc.resources.lambda;
const exerciseRetrieverLambda = exerciseRetFunc.resources.lambda;

// Get L2 Table constructs
const {
  Scenario: scenarioTable,
  GeminiUsageLog: geminiUsageLogTable,
  GeminiUsageErrorLog: geminiUsageErrorLogTable,
} = backend.data.resources.tables;

// 3. CONFIGURE ENVIRONMENT VARIABLES
// =============================================

// Add Scenario table name to functions that need it
scenarioGenFunc.addEnvironment('DDB_TABLE_NAME', scenarioTable.tableName);
customTextFunc.addEnvironment('DDB_TABLE_NAME', scenarioTable.tableName);
exerciseGenFunc.addEnvironment('DDB_TABLE_NAME', scenarioTable.tableName);
exerciseRetFunc.addEnvironment('DDB_TABLE_NAME', scenarioTable.tableName);

// Add Gemini log table names to all relevant functions in a loop
const geminiLoggingFunctions = [
  scenarioGenFunc,
  customTextFunc,
  pronunciationFunc,
  exerciseGenFunc,
];

for (const func of geminiLoggingFunctions) {
  func.addEnvironment(
    'GEMINI_USAGE_LOG_TABLE_NAME',
    geminiUsageLogTable.tableName
  );
  func.addEnvironment(
    'GEMINI_USAGE_ERROR_TABLE_NAME',
    geminiUsageErrorLogTable.tableName
  );
}

// Add usage log table name to usage-summary Lambda
usageSummaryFunc.addEnvironment(
  'GEMINI_USAGE_LOG_TABLE_NAME',
  geminiUsageLogTable.tableName
);

// 4. CONFIGURE IAM PERMISSIONS
// =============================================

// --- Reusable IAM Policies ---

// Policy to allow writing to Gemini log tables
const writeGeminiLogsPolicy = new PolicyStatement({
  sid: 'AllowWriteGeminiUsageLogs',
  effect: Effect.ALLOW,
  actions: ['dynamodb:PutItem', 'dynamodb:DescribeTable'],
  resources: [
    geminiUsageLogTable.tableArn,
    geminiUsageErrorLogTable.tableArn,
  ],
});

// Policy to allow reading from Scenario table's Global Secondary Indexes
const readScenarioGSIPolicy = new PolicyStatement({
  sid: 'AllowQueryScanOnScenarioGSIs',
  effect: Effect.ALLOW,
  actions: ['dynamodb:Query', 'dynamodb:Scan'],
  resources: [`${scenarioTable.tableArn}/index/*`],
});

// --- Attach Policies to Functions ---

// Grant base table + GSI permissions to Scenario and CustomText processors
scenarioTable.grantReadWriteData(scenarioLambda);
scenarioLambda.addToRolePolicy(readScenarioGSIPolicy);

scenarioTable.grantReadWriteData(customTextProcessorLambda);
customTextProcessorLambda.addToRolePolicy(readScenarioGSIPolicy);

// Grant read/write access to exercise generator and read access to exercise retriever
scenarioTable.grantReadWriteData(exerciseGeneratorLambda);
scenarioTable.grantReadData(exerciseRetrieverLambda);

// Grant write access to Gemini log tables in a loop
const geminiLoggingLambdas = [
  scenarioLambda,
  customTextProcessorLambda,
  pronunciationAssessorLambda,
  exerciseGeneratorLambda,
];

for (const lambda of geminiLoggingLambdas) {
  lambda.addToRolePolicy(writeGeminiLogsPolicy);
}

// Grant read permissions to usage-summary Lambda
usageSummaryLambda.addToRolePolicy(
  new PolicyStatement({
    sid: 'AllowReadGeminiUsageLogs',
    effect: Effect.ALLOW,
    actions: ['dynamodb:Query', 'dynamodb:Scan', 'dynamodb:GetItem'],
    resources: [
      geminiUsageLogTable.tableArn,
      `${geminiUsageLogTable.tableArn}/index/*`,
    ],
  })
);

// Configure DynamoDB Stream trigger for exercise generator
exerciseGeneratorLambda.addEventSource(
  new DynamoEventSource(scenarioTable, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 1,
    retryAttempts: 2,
  })
);

// 5. CONFIGURE PUBLIC S3 BUCKET (Storage Escape Hatch)
// =============================================
const bucket = backend.poliAssets.resources.bucket;

// Use L2 CfnBucket construct to modify public access
const cfnBucket = bucket.node.defaultChild as CfnBucket;
cfnBucket.publicAccessBlockConfiguration = {
  blockPublicAcls: false,
  blockPublicPolicy: false,
  ignorePublicAcls: false,
  restrictPublicBuckets: false,
};

// Add a public read-only policy to the bucket
bucket.addToResourcePolicy(
  new PolicyStatement({
    sid: 'AllowPublicRead',
    effect: Effect.ALLOW,
    actions: ['s3:GetObject'],
    principals: [new AnyPrincipal()],
    resources: [bucket.arnForObjects('*')],
  })
);

// 6. DEFINE BACKEND OUTPUTS
// =============================================
backend.addOutput({
  custom: {
    tables: {
      Scenario: {
        tableName: scenarioTable.tableName,
        tableArn: scenarioTable.tableArn,
      },
    },
  },
});
