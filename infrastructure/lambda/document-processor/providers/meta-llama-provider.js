const BaseLLMProvider = require('./base-llm-provider');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class MetaLLamaProvider extends BaseLLMProvider {
	constructor() {
		const config = {
			modelId: 'meta.llama3-8b-instruct-v1:0',
			maxTokens: 4000,
			temperature: 0.1,
		}
		super(config);
		this.client = new BedrockRuntimeClient({
			region: process.env.AWS_REGION,
		});
	}

	createPrompt(extractedText) {
		return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert at analyzing and classifying medical documents. Please analyze this medical document text and provide both classification and field extraction. You only respond with valid JSON. No explanations. No descriptions.

DOCUMENT CLASSIFICATION:
First, classify this document into one of these categories:
- "lab_requisition": Laboratory test orders, sample collection requests
- "lab_report": Laboratory test results, completed lab findings
- "prescription_order": Medication prescriptions, pharmacy orders
- "patient_registration": New patient forms, demographic information

REQUIRED FIELDS TO EXTRACT:
- firstName: Patient's first name
- lastName: Patient's last name
- dateOfBirth: Date of birth (MM/DD/YYYY format)
- sex: Biological Sex (M or F)

Here is the extracted text from the document:
${extractedText}

Return ONLY a valid JSON object with this structure:
{
	"documentClassification": {
	"primaryType": "category_name",
	"confidence": 0.95,
	"reasoning": "Brief explanation"
	},
	"extractedFields": {
	"firstName": "value or null",
	"lastName": "value or null",
	"dateOfBirth": "MM/DD/YYYY or null",
	"sex": "M, F, or null"
	}
} JSON:

<|eot_id|><|start_header_id|>user<|end_header_id|>

<|eot_id|><|start_header_id|>assistant<|end_header_id|>

{`;
	}

	getModelFamily() {
		return 'llama';
	}

	createPayload(prompt) {
		return {
			prompt: prompt,
			max_gen_len: this.config.maxTokens,
			temperature: this.config.temperature,
			top_p: 0.9
		}
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
		let rawGeneration = response.generation;

		// If response doesn't start with {, add it (since we ended prompt with {)
		if (!rawGeneration.trim().startsWith('{')) {
			rawGeneration = '{' + rawGeneration;
		}

		// If response doesn't end with }, try to complete it
		if (!rawGeneration.trim().endsWith('}')) {
			// Try to find where JSON might be cut off and close it
			const lastOpenBrace = rawGeneration.lastIndexOf('{');
			const lastCloseBrace = rawGeneration.lastIndexOf('}');
			if (lastOpenBrace > lastCloseBrace) {
				rawGeneration += '}';
			}
		}

		return rawGeneration;
	}
}

module.exports = MetaLLamaProvider;