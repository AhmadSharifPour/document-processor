const AmazonProvider = require('./amazon-titan-provider');
const ClaudeProvider = require('./claude-provider');
const MistralProvider = require('./mistral-provider');
const MetaProvider = require('./meta-llama-provider');

async function testProvider() {

	const amazonProvider = new AmazonProvider();
	const claudeProvider  = new ClaudeProvider();
	const mistralProvider = new MistralProvider();
    const metaProvider = new MetaProvider();

const sampleText = `
MEDICAL REQUEST FORM
Patient Name: John Smith
Date of Birth: 01/15/1980
Sex: Male
Test Requested: Blood work, CBC
Physician: Dr. Johnson
Date: 12/15/2024
`;
    const amazonResponse = await amazonProvider.processDocument(sampleText);
    const claudeResponse = await claudeProvider.processDocument(sampleText);
    const mistralResponse = await mistralProvider.processDocument(sampleText);
    const metaResponse = await metaProvider.processDocument(sampleText);
    console.log('amazon:', amazonResponse);
    console.log('claude:', claudeResponse);
    console.log('mistral:', mistralResponse);
    console.log('meta:', metaResponse);
}

testProvider();