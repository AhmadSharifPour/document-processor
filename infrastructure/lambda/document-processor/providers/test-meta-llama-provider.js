const MetaLLamaProvider = require('./meta-llama-provider');

async function testMetaLlamaProvider() {
    console.log('🧪 Testing Meta Llama Provider...');

    // Set environment variables
    process.env.AWS_REGION = 'us-east-1';

    try {
        const llamaProvider = new MetaLLamaProvider();
        console.log('✅ Meta Llama provider created successfully');
        console.log('🏷️ Model family:', llamaProvider.getModelFamily());
        console.log('⚙️ Config:', llamaProvider.config);

        const sampleText = `
MEDICAL REQUEST FORM
Patient Name: John Smith
Date of Birth: 01/15/1980
Sex: Male
Test Requested: Blood work, CBC
Physician: Dr. Johnson
Date: 12/15/2024
`;

        console.log('🔬 Testing document processing...');
        console.log('📄 Sample text length:', sampleText.length, 'characters');

        const result = await llamaProvider.processDocument(sampleText);

        console.log('\n📊 Processing Result:');
        console.log(result);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('🔍 Full error:', error);
    }
}

testMetaLlamaProvider();