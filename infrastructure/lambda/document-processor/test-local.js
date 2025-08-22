require('dotenv').config(); // Only for local testing
const { handler } = require('./index');

process.env.AWS_REGION = 'us-east-1';
process.env.TABLE_NAME = 'document-processor-metadata';
process.env.BUCKET_NAME = 'document-processor-665519496701-us-east-1';
process.env.LLM_PROVIDER = 'claude';

const mockEvent = {
    source: 'aws.s3',
    'detail-type': 'Object Created',
    detail: {
        bucket: {
            name: 'document-processor-665519496701-us-east-1'
        },
        object: {
            key: 'pretend-req-form-2.pdf',
            size: 653461
        }
    }
};

async function testLambda() {
    try {
        const result = await handler(mockEvent);
        console.log('execution completed successfully!', result);
    } catch (error) {
        console.error('❌ Lambda execution failed:', error.message);
    }
}

testLambda();