import OpenAI from 'openai';

/**
 * Determines if Azure OpenAI should be used based on environment variables.
 */
function isAzureOpenAI(): boolean {
    return !!process.env.AZURE_OPENAI_ENDPOINT;
}

/**
 * Creates and returns an OpenAI client configured for either Azure OpenAI or standard OpenAI.
 */
export function getOpenAIClient(): OpenAI {
    if (isAzureOpenAI()) {
        // Azure OpenAI configuration
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

        if (!apiKey) {
            throw new Error('AZURE_OPENAI_API_KEY is not set in environment variables.');
        }
        if (!endpoint) {
            throw new Error('AZURE_OPENAI_ENDPOINT is not set in environment variables.');
        }

        return new OpenAI({
            apiKey,
            baseURL: `${endpoint}/openai/deployments`,
            defaultQuery: { 'api-version': apiVersion },
            defaultHeaders: { 'api-key': apiKey },
        });
    } else {
        // Standard OpenAI configuration
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set in environment variables.');
        }
        return new OpenAI({ apiKey });
    }
}

/**
 * Returns the model or deployment name to use.
 * For Azure: returns the deployment name (required)
 * For OpenAI: returns the model name
 */
export function getModel(): string {
    if (isAzureOpenAI()) {
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
        if (!deployment) {
            throw new Error('AZURE_OPENAI_DEPLOYMENT is not set. Please specify your Azure deployment name.');
        }
        return deployment;
    } else {
        return process.env.OPENAI_MODEL || 'gpt-5-mini';
    }
}
