const ClaudeProvider = require('./claude-provider');
const MistralProvider = require('./mistral-provider');
const AmazonTitanProvider = require('./amazon-titan-provider');
const MetaLLamaProvider = require('./meta-llama-provider');

class LLMProviderFactory {
    static createProvider(providerType) {
        const type = providerType.toLowerCase();

        switch (type) {
            case 'claude':
                return new ClaudeProvider();
            case 'mistral':
                return new MistralProvider();
            case 'titan':
                return new AmazonTitanProvider();
            case 'llama':
                return new MetaLLamaProvider();
            case 'auto':
                return this._autoSelectProvider();
            default:
                return new ClaudeProvider();
        }
    }
}

module.exports = LLMProviderFactory;