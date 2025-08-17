import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for document storage
    const documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      bucketName: `document-processor-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For learning - allows cleanup
      autoDeleteObjects: true, // For learning - deletes contents when stack deleted
      versioned: true, // Keep file versions
      eventBridgeEnabled: true, // Enable EventBridge notifications
      publicReadAccess: false, // Ensure bucket is not public
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block all public access
    });

    // Comprehensive bucket policy to allow Textract service access
    documentBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowTextractServiceAccess',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('textract.amazonaws.com')],
      actions: [
        's3:GetObject',
        's3:GetObjectVersion',
        's3:GetObjectAcl',
        's3:GetObjectVersionAcl',
        's3:ListBucket',
        's3:GetBucketLocation',
        's3:GetBucketAcl'
      ],
      resources: [
        documentBucket.bucketArn,
        documentBucket.arnForObjects('*')
      ],
      conditions: {
        StringEquals: {
          'aws:SourceAccount': this.account
        }
      }
    }));

    // Additional policy to allow Textract console access
     documentBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowTextractConsoleAccess',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('textract.amazonaws.com')],
      actions: [
        's3:ListBucketVersions',
        's3:GetBucketVersioning',
        's3:GetBucketNotification'
      ],
      resources: [documentBucket.bucketArn],
      conditions: {
        StringEquals: {
          'aws:SourceAccount': this.account
        }
      }
    }));

    // DynamoDB table for document metadata
    const documentTable = new dynamodb.Table(this, 'DocumentTable', {
      tableName: 'document-processor-metadata',
      partitionKey: {
        name: 'documentId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For learning - allows cleanup
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // No provisioned capacity
    });

    // Global Secondary Index for querying by bucket and object key
    documentTable.addGlobalSecondaryIndex({
      indexName: 'bucket-object-index',
      partitionKey: {
        name: 'bucketName',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'objectKey',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Lambda function for document processing
    const documentProcessor = new lambda.Function(this, 'DocumentProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/document-processor', {
        exclude: ['node_modules', 'test-local.js', '.env', 'package-lock.json', 'providers/test-provider.js'],
      }),
      functionName: 'document-processor',
      timeout: cdk.Duration.minutes(10), // Increased for Textract processing
      memorySize: 1024, // Increased for Textract processing
      environment: {
        BUCKET_NAME: documentBucket.bucketName,
        TABLE_NAME: documentTable.tableName,
        LLM_PROVIDER: 'claude',
      },
    });

    // Grant Lambda permission to read from S3 bucket
    documentBucket.grantRead(documentProcessor);

    // Grant Lambda permission to read/write DynamoDB table
    documentTable.grantReadWriteData(documentProcessor);

    // Grant Lambda permission to call Textract
    documentProcessor.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'textract:DetectDocumentText',
        'textract:AnalyzeDocument',
        'textract:GetDocumentTextDetection',
        'textract:GetDocumentAnalysis'
      ],
      resources: ['*']
    }));

    // Grant Lambda permission to call Bedrock
    documentProcessor.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream'
      ],
      resources: ['*'] // Broad permissions for Bedrock models across regions
    }));

    // EventBridge rule to trigger Lambda on S3 object creation
    const s3UploadRule = new events.Rule(this, 'S3UploadRule', {
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [documentBucket.bucketName]
          }
        }
      },
    });

    // Add Lambda as target for the EventBridge rule
    s3UploadRule.addTarget(new targets.LambdaFunction(documentProcessor));

    // Output the bucket name for reference
    new cdk.CfnOutput(this, 'DocumentBucketName', {
      value: documentBucket.bucketName,
      description: 'Name of the S3 bucket for document storage',
    });

    // Output the bucket ARN for reference
    new cdk.CfnOutput(this, 'DocumentBucketArn', {
      value: documentBucket.bucketArn,
      description: 'ARN of the S3 bucket for document storage',
    });

    // Output the Lambda function name
    new cdk.CfnOutput(this, 'DocumentProcessorName', {
      value: documentProcessor.functionName,
      description: 'Name of the document processor Lambda function',
    });

    // Output the DynamoDB table name
    new cdk.CfnOutput(this, 'DocumentTableName', {
      value: documentTable.tableName,
      description: 'Name of the DynamoDB table for document metadata',
    });
  }
}
