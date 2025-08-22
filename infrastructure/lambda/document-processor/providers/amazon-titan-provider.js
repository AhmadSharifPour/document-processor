const { create } = require('domain');
const BaseLLMProvider = require('./base-llm-provider');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class AmazonTitanProvider extends BaseLLMProvider {
	constructor() {
		const config = {
			modelId: 'amazon.titan-text-express-v1',
			maxTokens: 4000,
			temperature: 0.1,
		}
		super(config);
		this.client = new BedrockRuntimeClient({
			region: process.env.AWS_REGION,
		});
	}

	getModelFamily() {
		return 'amazon';
	}

	createPayload(prompt) {
		return {
            inputText: prompt,
            textGenerationConfig: {
                maxTokenCount: 4000
            }
        };
	}

	async processDocument(extractedText) {
		const command = new InvokeModelCommand({
			modelId: this.config.modelId,
			contentType: 'application/json',
			body: JSON.stringify(this.createPayload(this.createPrompt(extractedText))),
		});

		const response = await this.client.send(command);
		const responseBody = JSON.parse(new TextDecoder().decode(response.body));
		return this.parseResponse(responseBody);
	}

	parseResponse(response) {
		return response.results[0].outputText;
	}
}

module.exports = AmazonTitanProvider;