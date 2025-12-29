import { IntentBundle } from '../providers/types';
import { ProviderRegistry } from '../providers/registry';
import { AntigravityProvider } from '../providers/antigravity-provider';
import { CursorProvider } from '../providers/cursor-provider';
import { AiderProvider } from '../providers/aider-provider';

/**
 * Get intent context from available AI coding assistants.
 * 
 * This is the main entry point for collecting intent data.
 * It automatically detects and uses the appropriate provider.
 * 
 * @returns IntentBundle with normalized intent data, or null if no provider detected
 */
export async function getIntentContext(): Promise<IntentBundle | null> {
    const registry = new ProviderRegistry();

    // Register all available providers
    registry.register(new AntigravityProvider());
    registry.register(new CursorProvider());
    registry.register(new AiderProvider());

    // Auto-detect and collect
    return await registry.detectAndCollect();
}
