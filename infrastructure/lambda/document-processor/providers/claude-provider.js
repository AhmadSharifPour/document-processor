const BaseLLMProvider = require ('./base-llm-provider');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class ClaudeProvider extends BaseLLMProvider {
	constructor() {
		const config = {
			modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
			maxTokens: 4000,
			temperature: 0.1,
		}
		super(config);
		this.client = new BedrockRuntimeClient({
			region: process.env.AWS_REGION,
		});
	}

	createPayload(prompt) {
        return {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ]
        };
    }

	getModelFamily() {
		return 'claude';
	}

	async processDocument(extractedText) {
		try {
			const bedrockCommand = new InvokeModelCommand({
				modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
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
		return response.content[0].text;

	}
}

module.exports = ClaudeProvider;