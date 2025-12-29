import { IntentBundle } from '../providers/types';

/**
 * Build a context prompt from an IntentBundle.
 * 
 * Formats the structured intent data into a prompt suitable for LLMs.
 * Handles null/empty bundles gracefully.
 * 
 * @param bundle IntentBundle from a provider, or null if no intent found
 * @returns Formatted context prompt string
 */
export function buildContextPrompt(bundle: IntentBundle | null): string {
    if (!bundle) {
        return 'No active AI session context found. Rely solely on the diff.';
    }

    let prompt = `AI CONTEXT (Source: ${bundle.source}, Confidence: ${bundle.confidence.toFixed(2)}):\n\n`;

    // Add goals
    if (bundle.goals && bundle.goals.length > 0) {
        prompt += 'Goals:\n';
        prompt += bundle.goals.map(g => `- ${g}`).join('\n');
        prompt += '\n\n';
    }

    // Add tasks
    if (bundle.tasks && bundle.tasks.length > 0) {
        prompt += 'Tasks:\n';
        prompt += bundle.tasks.map(t => `- ${t}`).join('\n');
        prompt += '\n\n';
    }

    // Add decisions
    if (bundle.decisions && bundle.decisions.length > 0) {
        prompt += 'Decisions:\n';
        prompt += bundle.decisions.map(d => `- ${d}`).join('\n');
        prompt += '\n\n';
    }

    // Add trade-offs
    if (bundle.tradeoffs && bundle.tradeoffs.length > 0) {
        prompt += 'Trade-offs:\n';
        prompt += bundle.tradeoffs.map(t => `- ${t}`).join('\n');
        prompt += '\n\n';
    }

    // Add constraints
    if (bundle.constraints && bundle.constraints.length > 0) {
        prompt += 'Constraints:\n';
        prompt += bundle.constraints.map(c => `- ${c}`).join('\n');
        prompt += '\n\n';
    }

    // Add raw notes if no structured data was found
    const hasStructuredData =
        (bundle.goals && bundle.goals.length > 0) ||
        (bundle.tasks && bundle.tasks.length > 0) ||
        (bundle.decisions && bundle.decisions.length > 0) ||
        (bundle.tradeoffs && bundle.tradeoffs.length > 0) ||
        (bundle.constraints && bundle.constraints.length > 0);

    if (!hasStructuredData && bundle.rawNotes) {
        prompt += 'Additional Context:\n';
        prompt += bundle.rawNotes;
        prompt += '\n';
    }

    return prompt.trim();
}
