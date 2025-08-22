const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { S3Client, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const LLMProviderFactory = require('./providers/llm-provider-factory');

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});
const textractClient = new TextractClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    console.log('Document processor started');

    try {
        if (event.source === 'aws.s3' && event['detail-type'] === 'Object Created') {
            const bucketName = event.detail.bucket.name;
            const objectKey = event.detail.object.key;
            const eventName = event['detail-type'];
            const objectSize = event.detail.object.size || 'Unknown';
            const timestamp = new Date().toISOString();

            // Document categorization
            const fileExtension = objectKey.split('.').pop().toLowerCase();
            const documentType = categorizeDocument(fileExtension);

            // Generate unique document ID
            const documentId = `${bucketName}/${objectKey}`.replace(/[^a-zA-Z0-9-_./]/g, '_');

            // Create initial metadata
            const metadata = {
                documentId: documentId,
                timestamp: timestamp,
                bucketName: bucketName,
                objectKey: objectKey,
                eventName: eventName,
                objectSize: objectSize,
                documentType: documentType,
                fileExtension: fileExtension,
                processedAt: timestamp,
                status: 'processing',
                eventSource: 'eventbridge',
                version: '1.0'
            };

            const tableName = process.env.TABLE_NAME;
            await docClient.send(new PutCommand({
               TableName: tableName,
               Item: metadata
            }));

            // Initialize processing results
            let ocrResults = null;
            let llmResults = null;
            let extractedText = null;
            let textractStatus = 'skipped';
            let bedrockStatus = 'skipped';

            // Process supported file types
            if (['pdf', 'png', 'jpg', 'jpeg', 'tiff'].includes(fileExtension)) {
                console.log('🔍 Step 1: Verifying S3 object...');
                const headObjectParams = { Bucket: bucketName, Key: objectKey };
                const headObjectResponse = await s3Client.send(new HeadObjectCommand(headObjectParams));

                console.log('🔍 Step 2: OCR Processing with Textract...');
                const ocrResult = await processWithTextract(bucketName, objectKey, objectSize);
                textractStatus = ocrResult.status;
                ocrResults = ocrResult.results;
                extractedText = ocrResult.extractedText;

                console.log('🤖 Step 3: Processing with Bedrock LLM...');
                const llmResult = await processWithBedrock(extractedText);
                bedrockStatus = llmResult.status;
                llmResults = llmResult.results;

            } else {
                console.log(`⏭️ Skipping processing for file type: ${fileExtension}`);
                textractStatus = 'skipped';
                bedrockStatus = 'skipped';
                ocrResults = { note: `File type ${fileExtension} not supported for OCR processing` };
                llmResults = { note: `File type ${fileExtension} not supported for LLM processing` };
            }

            // Store final results
            const finalMetadata = {
                ...metadata,
                status: (textractStatus === 'completed' || bedrockStatus === 'completed') ? 'completed' : 'partial',
                textractStatus: textractStatus,
                bedrockStatus: bedrockStatus,
                ocrResults: ocrResults,
                llmResults: llmResults,
                extractedTextLength: extractedText ? extractedText.length : 0,
                completedAt: new Date().toISOString()
            };

            console.log('💾 Storing final metadata with OCR and LLM results...');
             await docClient.send(new PutCommand({
                TableName: tableName,
                Item: finalMetadata
            }));

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Document processed with OCR and LLM successfully',
                    documentId: documentId,
                    fileName: objectKey,
                    documentType: documentType,
                    textractStatus: textractStatus,
                    bedrockStatus: bedrockStatus,
                    extractedTextLength: extractedText ? extractedText.length : 0,
                    timestamp: timestamp
                })
            };

        } else {
            console.log('Event not recognized as S3 EventBridge event');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Event received but not processed',
                    eventSource: event.source
                })
            };
        }

    } catch (error) {
        console.error('❌ Error processing document:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error processing document',
                error: error.message
            })
        }
    }
};

function categorizeDocument(fileExtension) {
    if (fileExtension === 'pdf') {
        return 'pdf-document';
    } else if (['jpg', 'jpeg', 'png', 'tiff'].includes(fileExtension)) {
        return 'image-document';
    } else if (['doc', 'docx'].includes(fileExtension)) {
        return 'word-document';
    }
    return 'unknown';
}

async function processWithTextract(bucketName, objectKey, objectSize) {
    if (objectSize >= 10000000) {
        console.log('⏭️ Skipping OCR - file too large for synchronous processing');
        return {
            status: 'skipped',
            results: {
                service: 'textract',
                note: 'Skipped - file too large for synchronous processing (>10MB)',
                processedAt: new Date().toISOString()
            },
            extractedText: null
        };
    }

    try {
        const textractParams = {
            Document: {
                S3Object: {
                    Bucket: bucketName,
                    Name: objectKey
                }
            },
            FeatureTypes: ['TABLES', 'FORMS']
        };

        const textractCommand = new AnalyzeDocumentCommand(textractParams);
        const textractResponse = await textractClient.send(textractCommand);

        const textBlocks = textractResponse.Blocks
            .filter(block => block.BlockType === 'LINE')
            .map(block => block.Text)
            .filter(text => text && text.trim().length > 0);

        const extractedText = textBlocks.join('\n');
        const averageConfidence = textractResponse.Blocks
            .filter(block => block.BlockType === 'LINE')
            .map(block => block.Confidence)
            .reduce((sum, conf) => sum + (conf || 0), 0) / textBlocks.length || 0;

        console.log(`✅ OCR completed: ${textBlocks.length} lines extracted`);

        return {
            status: 'completed',
            results: {
                service: 'textract-analyze',
                api: 'AnalyzeDocument',
                blocksFound: textractResponse.Blocks.length,
                linesExtracted: textBlocks.length,
                extractedText: extractedText,
                confidence: averageConfidence,
                processedAt: new Date().toISOString()
            },
            extractedText: extractedText
        };

    } catch (textractError) {
        console.log('⚠️ OCR failed (expected for multi-page):', textractError.message);
        return {
            status: 'failed',
            results: {
                service: 'textract',
                error: textractError.message,
                note: 'Expected failure for multi-page documents',
                processedAt: new Date().toISOString()
            },
            extractedText: null
        };
    }
}

async function processWithBedrock(extractedText) {
    if (!extractedText || extractedText.length === 0) {
        console.log('⏭️ Skipping LLM processing - no extracted text from Textract');
        return {
            status: 'skipped',
            results: {
                service: 'bedrock',
                note: 'Skipped - no extracted text available from Textract OCR',
                processedAt: new Date().toISOString()
            }
        };
    }

    try {
        const llmProvider = LLMProviderFactory.createProvider(process.env.LLM_PROVIDER);
        let llmContent = await llmProvider.processDocument(extractedText);
        const parsedResponse = JSON.parse(llmContent);
        const llmExtractedData = parsedResponse.extractedFields || parsedResponse;
        console.log('🤖 LLM processing completed');

        return {
            status: 'completed',
            results: {
                service: 'bedrock',
                documentClassification: parsedResponse.documentClassification,
                extractedData: llmExtractedData,
                rawResponse: llmContent,
                //processingTimeMs: duration,
                //processingTimePreciseMs: parseFloat(durationPrecise.toFixed(2)),
                processedAt: new Date().toISOString()
            }
        };

    } catch (bedrockError) {
        console.error('❌ Bedrock processing failed:', bedrockError.message);
        return {
            status: 'failed',
            results: {
                service: 'bedrock',
                error: bedrockError.message,
                errorCode: bedrockError.code,
                processedAt: new Date().toISOString()
            }
        };
    }
}
