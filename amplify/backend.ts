import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource.js';
import { scenarioGenerator } from './functions/scenario-generator/resource';
import { customTextProcessor } from './functions/custom-text-processor/resource';
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";

import { aws_s3 as s3 } from 'aws-cdk-lib';
import { auth } from "./auth/resource";

import * as iam from "aws-cdk-lib/aws-iam"
import { poliAssets } from './storage/resource.js';

const backend = defineBackend({
  auth,
  data,
  scenarioGenerator,
  customTextProcessor,
  poliAssets
});


const scenarioLambda = backend.scenarioGenerator.resources.lambda
const customTextProcessorLambda = backend.customTextProcessor.resources.lambda
const scenarioTable = backend.data.resources.tables.Scenario;

// Get the DynamoDB table created by Amplify Data (your Scenario model)

backend.scenarioGenerator.addEnvironment(
  'DDB_TABLE_NAME',  // Env var name (use in Lambda code)
  scenarioTable.tableName  // References the auto-generated table
);

backend.customTextProcessor.addEnvironment(
  'DDB_TABLE_NAME',  // Env var name (use in Lambda code)
  scenarioTable.tableName  // References the auto-generated table
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