import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { glob } from 'glob';
import { IntentProvider, IntentBundle } from './types';

/**
 * Intent Provider for Claude Code (Anthropic's CLI for Claude).
 *
 * Collects intent from Claude Code's session data:
 * - ~/.claude/projects/<project-hash>/*.jsonl - Conversation history
 * - Parses messages, todos, and assistant responses
 */
export class ClaudeCodeProvider implements IntentProvider {
    name = 'claude-code';

    private claudeDir: string;
    private projectsDir: string;

    constructor() {
        // Allow custom directory via environment variable
        this.claudeDir = process.env.CLAUDE_CODE_DIR ||
            path.join(os.homedir(), '.claude');
        this.projectsDir = path.join(this.claudeDir, 'projects');
    }

    async detect(): Promise<boolean> {
        try {
            // Check if Claude projects directory exists
            if (!fs.existsSync(this.projectsDir)) {
                return false;
            }

            // Check if there are any JSONL session files
            const sessionFiles = await glob(`${this.projectsDir}/**/*.jsonl`);
            return sessionFiles.length > 0;
        } catch (error) {
            return false;
        }
    }

    async collect(): Promise<IntentBundle | null> {
        try {
            // Find all JSONL session files
            const sessionFiles = await glob(`${this.projectsDir}/**/*.jsonl`);

            if (sessionFiles.length === 0) {
                return null;
            }

            // Sort by modification time (newest first)
            const sortedFiles = sessionFiles.map(file => ({
                path: file,
                mtime: fs.statSync(file).mtime.getTime()
            })).sort((a, b) => b.mtime - a.mtime);

            // Use the most recent session file
            const latestFile = sortedFiles[0].path;
            const sessionName = path.basename(latestFile, '.jsonl');

            console.log(`[Claude Code] Using session: ${sessionName}`);

            // Read and parse the JSONL file
            const content = fs.readFileSync(latestFile, 'utf-8');
            const messages = this.parseJsonl(content);

            // Extract intent from messages
            const bundle: IntentBundle = {
                goals: this.extractGoals(messages),
                tasks: this.extractTasks(messages),
                decisions: this.extractDecisions(messages),
                tradeoffs: this.extractTradeoffs(messages),
                constraints: this.extractConstraints(messages),
                rawNotes: this.buildRawNotes(messages),
                confidence: this.calculateConfidence(messages),
                source: this.name
            };

            console.log(`[Claude Code] Collected intent (confidence: ${bundle.confidence.toFixed(2)})`);

            return bundle;

        } catch (error) {
            console.error('[Claude Code] Error collecting intent:', error);
            return null;
        }
    }

    /**
     * Parse JSONL content into message objects.
     */
    private parseJsonl(content: string): any[] {
        const messages: any[] = [];
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                messages.push(parsed);
            } catch {
                // Skip invalid JSON lines
            }
        }

        return messages;
    }

    /**
     * Extract goals from user messages and assistant summaries.
     * Looks for initial user requests and high-level objectives.
     */
    private extractGoals(messages: any[]): string[] {
        const goals: string[] = [];

        for (const msg of messages) {
            // Extract from user messages (first few are usually the goal)
            if (msg.type === 'user' && msg.message?.content) {
                const content = this.extractTextContent(msg.message.content);
                // First user message often contains the main goal
                if (goals.length === 0 && content.length < 500) {
                    goals.push(content);
                }
            }

            // Extract from summary messages
            if (msg.type === 'summary' && msg.summary) {
                const summaryText = typeof msg.summary === 'string'
                    ? msg.summary
                    : JSON.stringify(msg.summary);
                if (summaryText.length < 1000) {
                    goals.push(summaryText.substring(0, 500));
                }
            }
        }

        return goals.slice(0, 5); // Limit to 5 goals
    }

    /**
     * Extract tasks from todo lists in the session.
     */
    private extractTasks(messages: any[]): string[] {
        const tasks: string[] = [];
        const seenTasks = new Set<string>();

        for (const msg of messages) {
            // Extract from todoWrite events
            if (msg.todos && Array.isArray(msg.todos)) {
                for (const todo of msg.todos) {
                    const taskContent = todo.content || todo.task || todo.description;
                    if (taskContent && !seenTasks.has(taskContent)) {
                        const status = todo.status || 'pending';
                        const prefix = status === 'completed' ? '[x]' : '[ ]';
                        tasks.push(`${prefix} ${taskContent}`);
                        seenTasks.add(taskContent);
                    }
                }
            }

            // Also check for nested todos in tool results
            if (msg.type === 'tool_result' && msg.content) {
                const content = typeof msg.content === 'string'
                    ? msg.content
                    : JSON.stringify(msg.content);

                // Extract markdown-style tasks
                const taskMatches = content.match(/^[\s-]*\[[\sx/]\]\s+.+$/gm);
                if (taskMatches) {
                    for (const match of taskMatches) {
                        const cleaned = match.trim();
                        if (!seenTasks.has(cleaned)) {
                            tasks.push(cleaned);
                            seenTasks.add(cleaned);
                        }
                    }
                }
            }
        }

        return tasks;
    }

    /**
     * Extract decisions from assistant responses.
     * Looks for decision-related language patterns.
     */
    private extractDecisions(messages: any[]): string[] {
        const decisions: string[] = [];
        const decisionPatterns = [
            /I('ll| will) use\s+(.+?)(?:\.|$)/gi,
            /decided to\s+(.+?)(?:\.|$)/gi,
            /choosing\s+(.+?)(?:\.|$)/gi,
            /going with\s+(.+?)(?:\.|$)/gi,
            /approach[:\s]+(.+?)(?:\.|$)/gi
        ];

        for (const msg of messages) {
            if (msg.type === 'assistant' && msg.message?.content) {
                const content = this.extractTextContent(msg.message.content);

                for (const pattern of decisionPatterns) {
                    const matches = content.matchAll(pattern);
                    for (const match of matches) {
                        const decision = (match[1] || match[2] || '').trim();
                        if (decision && decision.length > 10 && decision.length < 200) {
                            decisions.push(decision);
                        }
                    }
                }
            }
        }

        return [...new Set(decisions)].slice(0, 10); // Dedupe and limit
    }

    /**
     * Extract trade-offs from assistant responses.
     * Looks for trade-off and consideration language.
     */
    private extractTradeoffs(messages: any[]): string[] {
        const tradeoffs: string[] = [];
        const tradeoffPatterns = [
            /trade-?off[:\s]+(.+?)(?:\.|$)/gi,
            /caveat[:\s]+(.+?)(?:\.|$)/gi,
            /note that\s+(.+?)(?:\.|$)/gi,
            /however[,:\s]+(.+?)(?:\.|$)/gi,
            /downside[:\s]+(.+?)(?:\.|$)/gi
        ];

        for (const msg of messages) {
            if (msg.type === 'assistant' && msg.message?.content) {
                const content = this.extractTextContent(msg.message.content);

                for (const pattern of tradeoffPatterns) {
                    const matches = content.matchAll(pattern);
                    for (const match of matches) {
                        const tradeoff = (match[1] || '').trim();
                        if (tradeoff && tradeoff.length > 10 && tradeoff.length < 200) {
                            tradeoffs.push(tradeoff);
                        }
                    }
                }
            }
        }

        return [...new Set(tradeoffs)].slice(0, 10);
    }

    /**
     * Extract constraints from user messages.
     * Looks for requirement and constraint language.
     */
    private extractConstraints(messages: any[]): string[] {
        const constraints: string[] = [];
        const constraintPatterns = [
            /must\s+(.+?)(?:\.|$)/gi,
            /should\s+(.+?)(?:\.|$)/gi,
            /need to\s+(.+?)(?:\.|$)/gi,
            /require[ds]?\s+(.+?)(?:\.|$)/gi,
            /constraint[:\s]+(.+?)(?:\.|$)/gi
        ];

        for (const msg of messages) {
            if (msg.type === 'user' && msg.message?.content) {
                const content = this.extractTextContent(msg.message.content);

                for (const pattern of constraintPatterns) {
                    const matches = content.matchAll(pattern);
                    for (const match of matches) {
                        const constraint = (match[1] || '').trim();
                        if (constraint && constraint.length > 10 && constraint.length < 200) {
                            constraints.push(constraint);
                        }
                    }
                }
            }
        }

        return [...new Set(constraints)].slice(0, 10);
    }

    /**
     * Extract text content from message content (handles arrays and objects).
     */
    private extractTextContent(content: any): string {
        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            return content
                .filter(block => block.type === 'text')
                .map(block => block.text || '')
                .join('\n');
        }

        if (content && typeof content === 'object' && content.text) {
            return content.text;
        }

        return '';
    }

    /**
     * Build raw notes from conversation messages.
     * Summarizes the conversation for context.
     */
    private buildRawNotes(messages: any[]): string {
        const notes: string[] = [];
        notes.push('=== Claude Code Session ===\n');

        // Get last N messages for context
        const recentMessages = messages.slice(-20);

        for (const msg of recentMessages) {
            if (msg.type === 'user' && msg.message?.content) {
                const content = this.extractTextContent(msg.message.content);
                if (content) {
                    notes.push(`User: ${content.substring(0, 500)}`);
                }
            }

            if (msg.type === 'assistant' && msg.message?.content) {
                const content = this.extractTextContent(msg.message.content);
                if (content) {
                    notes.push(`Assistant: ${content.substring(0, 500)}`);
                }
            }
        }

        return notes.join('\n\n');
    }

    /**
     * Calculate confidence score based on message quality and quantity.
     */
    private calculateConfidence(messages: any[]): number {
        if (messages.length === 0) return 0;

        let confidence = 0.3; // Base confidence

        // More messages = more context
        if (messages.length > 5) confidence += 0.2;
        if (messages.length > 20) confidence += 0.1;

        // Check for todo items
        const hasTodos = messages.some(m => m.todos && m.todos.length > 0);
        if (hasTodos) confidence += 0.2;

        // Check for user goals/requests
        const hasUserMessages = messages.some(m => m.type === 'user');
        if (hasUserMessages) confidence += 0.1;

        // Check for assistant responses
        const hasAssistantMessages = messages.some(m => m.type === 'assistant');
        if (hasAssistantMessages) confidence += 0.1;

        return Math.min(1.0, confidence);
    }
}
