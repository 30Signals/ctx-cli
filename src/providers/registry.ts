import { IntentProvider, IntentBundle } from './types';

/**
 * Registry for managing multiple Intent Providers.
 * 
 * Supports:
 * - Auto-detection: Tries all providers, uses first successful
 * - Explicit selection: Use specific provider via environment variable
 */
export class ProviderRegistry {
    private providers: IntentProvider[] = [];

    /**
     * Register a new intent provider.
     */
    register(provider: IntentProvider): void {
        this.providers.push(provider);
        console.log(`[Registry] Registered provider: ${provider.name}`);
    }

    /**
     * Get a provider by name.
     */
    getProviderByName(name: string): IntentProvider | undefined {
        return this.providers.find(p => p.name === name);
    }

    /**
     * Detect and collect intent from available providers.
     * 
     * Behavior:
     * 1. If INTENT_PROVIDER env var is set, use that provider explicitly
     * 2. Otherwise, auto-detect by trying all providers in order
     * 3. Return intent from first successful provider
     * 
     * @returns IntentBundle from detected provider, or null if none found
     */
    async detectAndCollect(): Promise<IntentBundle | null> {
        const explicitProvider = process.env.INTENT_PROVIDER;

        if (explicitProvider) {
            console.log(`[Registry] Using explicit provider: ${explicitProvider}`);
            return await this.collectFromProvider(explicitProvider);
        }

        console.log('[Registry] Auto-detecting intent providers...');

        // Try each provider in order
        for (const provider of this.providers) {
            try {
                const detected = await provider.detect();

                if (detected) {
                    console.log(`[Registry] Detected: ${provider.name}`);
                    const bundle = await provider.collect();

                    if (bundle) {
                        return bundle;
                    } else {
                        console.warn(`[Registry] ${provider.name} detected but collection failed`);
                    }
                }
            } catch (error) {
                console.error(`[Registry] Error with provider ${provider.name}:`, error);
            }
        }

        console.log('[Registry] No intent providers detected');
        return null;
    }

    /**
     * Collect intent from a specific provider by name.
     */
    private async collectFromProvider(name: string): Promise<IntentBundle | null> {
        const provider = this.getProviderByName(name);

        if (!provider) {
            console.error(`[Registry] Provider not found: ${name}`);
            return null;
        }

        try {
            const detected = await provider.detect();

            if (!detected) {
                console.warn(`[Registry] Provider ${name} not detected`);
                return null;
            }

            return await provider.collect();
        } catch (error) {
            console.error(`[Registry] Error collecting from ${name}:`, error);
            return null;
        }
    }
}
