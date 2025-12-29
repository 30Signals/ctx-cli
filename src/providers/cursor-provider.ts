import { IntentProvider, IntentBundle } from './types';

/**
 * Intent Provider for Cursor IDE.
 * 
 * TODO: Implement detection and collection logic.
 * Potential sources:
 * - .cursorrules file
 * - Cursor chat history
 * - Workspace-specific context files
 */
export class CursorProvider implements IntentProvider {
    name = 'cursor';

    async detect(): Promise<boolean> {
        // TODO: Check for .cursorrules or Cursor-specific artifacts
        return false;
    }

    async collect(): Promise<IntentBundle | null> {
        // TODO: Parse Cursor chat history and rules
        return null;
    }
}
