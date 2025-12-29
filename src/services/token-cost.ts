// Simple token cost calculator based on model pricing.
// Prices are expressed in USD per 1,000 tokens.
export interface ModelPricing {
    inputCostPer1k: number; // $ per 1k input tokens
    outputCostPer1k: number; // $ per 1k output tokens
}

const pricingMap: Record<string, ModelPricing> = {
    // Prices from OpenAI (as of 2024)
    'gpt-4o-mini': { inputCostPer1k: 0.015, outputCostPer1k: 0.06 },
    'gpt-4o': { inputCostPer1k: 2.5, outputCostPer1k: 10 },
    'gpt-4-turbo': { inputCostPer1k: 1.0, outputCostPer1k: 3.0 },
    'gpt-4': { inputCostPer1k: 3.0, outputCostPer1k: 6.0 },
    // fallback
    'default': { inputCostPer1k: 0.0, outputCostPer1k: 0.0 },
};

/**
 * Extracts the base model name from Azure deployment names.
 * Azure deployments often follow patterns like "gpt-4o-mini-deployment" or "my-gpt-4o".
 * This function attempts to identify the underlying model for pricing.
 */
function extractBaseModel(deploymentName: string): string {
    const lowerName = deploymentName.toLowerCase();

    // Check for known model patterns in the deployment name
    if (lowerName.includes('gpt-4o-mini')) return 'gpt-4o-mini';
    if (lowerName.includes('gpt-4o')) return 'gpt-4o';
    if (lowerName.includes('gpt-4-turbo')) return 'gpt-4-turbo';
    if (lowerName.includes('gpt-4')) return 'gpt-4';

    // Return the original name if no pattern matches
    return deploymentName;
}

/** Retrieve pricing for a given model name or Azure deployment name. */
export function getPricing(model: string): ModelPricing {
    // First try direct lookup
    if (pricingMap[model]) {
        return pricingMap[model];
    }

    // Try extracting base model from Azure deployment name
    const baseModel = extractBaseModel(model);
    return pricingMap[baseModel] ?? pricingMap['default'];
}

/** Calculate cost in USD from token usage. */
export function calculateCost(
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
): number {
    const { inputCostPer1k, outputCostPer1k } = getPricing(model);
    const inputCost = (usage.prompt_tokens / 1000) * inputCostPer1k;
    const outputCost = (usage.completion_tokens / 1000) * outputCostPer1k;
    return inputCost + outputCost;
}
