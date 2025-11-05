import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource.js';
import { scenarioGenerator } from './functions/scenario-generator/resource';
import { pronunciationAssessor } from './functions/pronunciation-assessor/resource';
import { customTextProcessor } from './functions/custom-text-processor/resource';
import { usageSummary } from './functions/usage-summary/resource';
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";

import { aws_s3 as s3 } from 'aws-cdk-lib';
import { auth } from "./auth/resource";

import * as iam from "aws-cdk-lib/aws-iam"
import { poliAssets } from './storage/resource.js';

const backend = defineBackend({
  auth,
  data,
  scenarioGenerator,
  pronunciationAssessor,
  customTextProcessor,
  usageSummary,
  poliAssets
});


const scenarioLambda = backend.scenarioGenerator.resources.lambda
const pronunciationAssessorLambda = backend.pronunciationAssessor.resources.lambda
const customTextProcessorLambda = backend.customTextProcessor.resources.lambda
const usageSummaryLambda = backend.usageSummary.resources.lambda
const scenarioTable = backend.data.resources.tables.Scenario;
const geminiUsageLogTable = backend.data.resources.tables.GeminiUsageLog;
const geminiUsageErrorLogTable = backend.data.resources.tables.GeminiUsageErrorLog;

// Get the DynamoDB table created by Amplify Data (your Scenario model)

backend.scenarioGenerator.addEnvironment(
  'DDB_TABLE_NAME',  // Env var name (use in Lambda code)
  scenarioTable.tableName  // References the auto-generated table
);

backend.customTextProcessor.addEnvironment(
  'DDB_TABLE_NAME',  // Env var name (use in Lambda code)
  scenarioTable.tableName  // References the auto-generated table
);

// Add usage log table names to all Lambda functions that use Gemini
backend.scenarioGenerator.addEnvironment(
  'GEMINI_USAGE_LOG_TABLE_NAME',
  geminiUsageLogTable.tableName
);

backend.scenarioGenerator.addEnvironment(
  'GEMINI_USAGE_ERROR_TABLE_NAME',
  geminiUsageErrorLogTable.tableName
);

backend.customTextProcessor.addEnvironment(
  'GEMINI_USAGE_LOG_TABLE_NAME',
  geminiUsageLogTable.tableName
);

backend.customTextProcessor.addEnvironment(
  'GEMINI_USAGE_ERROR_TABLE_NAME',
  geminiUsageErrorLogTable.tableName
);

// Add usage log table names to pronunciation-assessor
backend.pronunciationAssessor.addEnvironment(
  'GEMINI_USAGE_LOG_TABLE_NAME',
  geminiUsageLogTable.tableName
);

backend.pronunciationAssessor.addEnvironment(
  'GEMINI_USAGE_ERROR_TABLE_NAME',
  geminiUsageErrorLogTable.tableName
);

// Add usage log table name to usage-summary Lambda
backend.usageSummary.addEnvironment(
  'GEMINI_USAGE_LOG_TABLE_NAME',
  geminiUsageLogTable.tableName
);

// Grant CRUD + query permissions automatically
scenarioTable.grantReadWriteData(scenarioLambda)

scenarioLambda.addToRolePolicy(new iam.PolicyStatement({
  sid: "AllowQueryScanOnScenarioGSIs",
  actions: ["dynamodb:Query", "dynamodb:Scan"],
  resources: [`${scenarioTable.tableArn}/index/*`], // <- GSI ARNs
}));



scenarioLambda.addToRolePolicy(new iam.PolicyStatement({
  sid: "AllowRWOnScenarioTable",
  actions: [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:DeleteItem",
    "dynamodb:BatchGetItem",
    "dynamodb:BatchWriteItem",
    "dynamodb:DescribeTable",
  ],
  resources: [scenarioTable.tableArn], // <- table ARN only
}));

customTextProcessorLambda.addToRolePolicy(new iam.PolicyStatement({
  sid: "AllowQueryScanOnScenarioGSIs",
  actions: ["dynamodb:Query", "dynamodb:Scan"],
  resources: [`${scenarioTable.tableArn}/index/*`], // <- GSI ARNs
}));

customTextProcessorLambda.addToRolePolicy(new iam.PolicyStatement({
  sid: "AllowRWOnScenarioTable",
  actions: [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:DeleteItem",
    "dynamodb:BatchGetItem",
    "dynamodb:BatchWriteItem",
    "dynamodb:DescribeTable",
  ],
  resources: [scenarioTable.tableArn], // <- table ARN only
}));

// Grant write permissions for Gemini usage logging to all Lambda functions that use Gemini
scenarioLambda.addToRolePolicy(new iam.PolicyStatement({
  sid: "AllowWriteGeminiUsageLogs",
  actions: [
    "dynamodb:PutItem",
    "dynamodb:DescribeTable",
  ],
  resources: [
    geminiUsageLogTable.tableArn,
    geminiUsageErrorLogTable.tableArn,
  ],
}));

customTextProcessorLambda.addToRolePolicy(new iam.PolicyStatement({
  sid: "AllowWriteGeminiUsageLogs",
  actions: [
    "dynamodb:PutItem",
    "dynamodb:DescribeTable",
  ],
  resources: [
    geminiUsageLogTable.tableArn,
    geminiUsageErrorLogTable.tableArn,
  ],
}));

pronunciationAssessorLambda.addToRolePolicy(new iam.PolicyStatement({
  sid: "AllowWriteGeminiUsageLogs",
  actions: [
    "dynamodb:PutItem",
    "dynamodb:DescribeTable",
  ],
  resources: [
    geminiUsageLogTable.tableArn,
    geminiUsageErrorLogTable.tableArn,
  ],
}));

// Grant read permissions to usage-summary Lambda for querying usage logs
usageSummaryLambda.addToRolePolicy(new iam.PolicyStatement({
  sid: "AllowReadGeminiUsageLogs",
  actions: [
    "dynamodb:Query",
    "dynamodb:Scan",
    "dynamodb:GetItem",
    "dynamodb:DescribeTable",
  ],
  resources: [
    geminiUsageLogTable.tableArn,
    `${geminiUsageLogTable.tableArn}/index/*`,
  ],
}));

// --- Modify the underlying bucket (remove BlockPublicAccess + add policy) ---
const bucket = backend.poliAssets.resources.bucket;

// Escape hatch: Access low-level CfnBucket to disable Block Public Access
const cfnBucket = bucket.node.defaultChild as s3.CfnBucket;
cfnBucket.publicAccessBlockConfiguration = {
  blockPublicAcls: false,
  blockPublicPolicy: false,  // Key: Allows public policies like yours
  ignorePublicAcls: false,
  restrictPublicBuckets: false,
};

// Add public read policy (no sid; use AnyPrincipal and arnForObjects)
bucket.addToResourcePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['s3:GetObject'],
    principals: [new iam.AnyPrincipal()],
    resources: [bucket.arnForObjects('*')],
  })
);

// 3️⃣ Add an output so that the table name is exported to amplify_outputs.json
backend.addOutput({
  custom: {
    tables: {
      Scenario: {
        tableName: scenarioTable.tableName,
        tableArn: scenarioTable.tableArn,
      },
    }
  },
});