const BaseLLMProvider = require ('./base-llm-provider');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class MistralProvider extends BaseLLMProvider {
	constructor() {
		const config = {
			modelId: 'mistral.mistral-7b-instruct-v0:2',
			maxTokens: 4000,
			temperature: 0.1,
		}
		super(config);
		this.client = new BedrockRuntimeClient({
			region: process.env.AWS_REGION,
		});
	}

	getModelFamily() {
		return 'mistral';
	}

	createPayload(prompt) {
		return {
			prompt: `<s>[INST] ${prompt} [/INST]`,
			max_tokens: this.config.maxTokens,
			temperature: this.config.temperature
		}
	}

	async processDocument(extractedText) {
		try {
			const bedrockCommand = new InvokeModelCommand({
				modelId: this.config.modelId,
				contentType: 'application/json',
				body: JSON.stringify(this.createPayload(this.createPrompt(extractedText)))
			});

			const response = await this.client.send(bedrockCommand);
			const responseBody = JSON.parse(new TextDecoder().decode(response.body));

			return this.parseResponse(responseBody);
		} catch (error) {
			console.error('Error processing document:', error);
			throw error;
		}
	}

	parseResponse(response) {
		return response.outputs[0].text;
	}
}

module.exports = MistralProvider;