// Simple token cost calculator based on model pricing.
// Prices are expressed in USD per 1,000,000 tokens.
export interface ModelPricing {
    inputCostPer1m: number; // $ per 1m input tokens
    outputCostPer1m: number; // $ per 1m output tokens
}

const pricingMap: Record<string, ModelPricing> = {
    // Prices from OpenAI (as of 2024) - USD per 1M tokens
    'gpt-4o-mini': { inputCostPer1m: 0.15, outputCostPer1m: 0.60 },
    'gpt-4o': { inputCostPer1m: 2.50, outputCostPer1m: 10.00 },
    'gpt-4-turbo': { inputCostPer1m: 10.00, outputCostPer1m: 30.00 },
    'gpt-4': { inputCostPer1m: 30.00, outputCostPer1m: 60.00 },
    // fallback
    'default': { inputCostPer1m: 0.0, outputCostPer1m: 0.0 },
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
    const { inputCostPer1m, outputCostPer1m } = getPricing(model);
    const inputCost = (usage.prompt_tokens / 1000000) * inputCostPer1m;
    const outputCost = (usage.completion_tokens / 1000000) * outputCostPer1m;
    return inputCost + outputCost;
}
