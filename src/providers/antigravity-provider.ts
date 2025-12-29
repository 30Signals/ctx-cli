import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { IntentProvider, IntentBundle } from './types';

/**
 * Intent Provider for Antigravity Agent.
 * 
 * Collects intent from Antigravity's brain directory:
 * - task.md: Task lists and progress
 * - implementation_plan.md: Goals, decisions, and trade-offs
 */
export class AntigravityProvider implements IntentProvider {
    name = 'antigravity';

    private brainDir: string;

    constructor() {
        // Allow custom brain directory via environment variable
        this.brainDir = process.env.ANTIGRAVITY_BRAIN_DIR ||
            'C:/Users/katro/.gemini/antigravity/brain';
    }

    async detect(): Promise<boolean> {
        try {
            // Check if brain directory exists
            if (!fs.existsSync(this.brainDir)) {
                return false;
            }

            // Check if there are any session directories
            const sessionDirs = await glob(`${this.brainDir}/*/`);
            return sessionDirs.length > 0;
        } catch (error) {
            return false;
        }
    }

    async collect(): Promise<IntentBundle | null> {
        try {
            // Find all session directories
            const sessionDirs = await glob(`${this.brainDir}/*/`);

            if (sessionDirs.length === 0) {
                return null;
            }

            // Sort by modification time (newest first)
            const sortedSessions = sessionDirs.map(dir => ({
                path: dir,
                mtime: fs.statSync(dir).mtime.getTime()
            })).sort((a, b) => b.mtime - a.mtime);

            const latestSessionDir = sortedSessions[0].path;
            const sessionId = path.basename(latestSessionDir);

            console.log(`[Antigravity] Using session: ${sessionId}`);

            // Read artifacts
            const taskPath = path.join(latestSessionDir, 'task.md');
            const planPath = path.join(latestSessionDir, 'implementation_plan.md');

            let taskContent = '';
            let planContent = '';
            let artifactCount = 0;

            if (fs.existsSync(taskPath)) {
                taskContent = fs.readFileSync(taskPath, 'utf-8');
                artifactCount++;
            }

            if (fs.existsSync(planPath)) {
                planContent = fs.readFileSync(planPath, 'utf-8');
                artifactCount++;
            }

            // Parse intent from artifacts
            const bundle: IntentBundle = {
                goals: this.extractGoals(planContent),
                tasks: this.extractTasks(taskContent),
                decisions: this.extractDecisions(planContent),
                tradeoffs: this.extractTradeoffs(planContent),
                constraints: this.extractConstraints(planContent),
                rawNotes: this.buildRawNotes(taskContent, planContent),
                confidence: this.calculateConfidence(artifactCount, taskContent, planContent),
                source: this.name
            };

            console.log(`[Antigravity] Collected intent (confidence: ${bundle.confidence.toFixed(2)})`);

            return bundle;

        } catch (error) {
            console.error('[Antigravity] Error collecting intent:', error);
            return null;
        }
    }

    /**
     * Extract goals from implementation plan.
     * Looks for content under "# [Goal]" or "## Summary" sections.
     */
    private extractGoals(planContent: string): string[] {
        if (!planContent) return [];

        const goals: string[] = [];
        const lines = planContent.split('\n');

        // Extract from first heading (usually the goal description)
        const firstHeading = lines.find(line => line.startsWith('# '));
        if (firstHeading) {
            goals.push(firstHeading.replace(/^#\s+/, ''));
        }

        // Extract from Summary section
        let inSummary = false;
        for (const line of lines) {
            if (line.match(/^##\s+Summary/i)) {
                inSummary = true;
                continue;
            }
            if (inSummary && line.startsWith('##')) {
                break;
            }
            if (inSummary && line.trim() && !line.startsWith('#')) {
                goals.push(line.trim());
            }
        }

        return goals.filter(g => g.length > 0);
    }

    /**
     * Extract tasks from task.md.
     * Parses markdown checklist items.
     */
    private extractTasks(taskContent: string): string[] {
        if (!taskContent) return [];

        const tasks: string[] = [];
        const lines = taskContent.split('\n');

        for (const line of lines) {
            // Match markdown checklist items: - [ ], - [x], - [/]
            const match = line.match(/^[\s-]*\[[\sx/]\]\s+(.+)$/);
            if (match) {
                tasks.push(match[1].trim());
            }
        }

        return tasks;
    }

    /**
     * Extract decisions from implementation plan.
     * Looks for "User Review Required" or "Decisions" sections.
     */
    private extractDecisions(planContent: string): string[] {
        if (!planContent) return [];

        const decisions: string[] = [];
        const lines = planContent.split('\n');

        let inDecisions = false;
        for (const line of lines) {
            if (line.match(/^##\s+(User Review Required|Decisions)/i)) {
                inDecisions = true;
                continue;
            }
            if (inDecisions && line.startsWith('##')) {
                break;
            }
            if (inDecisions && line.trim() && !line.startsWith('#') && !line.startsWith('>')) {
                decisions.push(line.trim());
            }
        }

        return decisions;
    }

    /**
     * Extract trade-offs from implementation plan.
     * Looks for "Trade-offs" sections or WARNING/IMPORTANT alerts.
     */
    private extractTradeoffs(planContent: string): string[] {
        if (!planContent) return [];

        const tradeoffs: string[] = [];
        const lines = planContent.split('\n');

        let inTradeoffs = false;
        for (const line of lines) {
            if (line.match(/^##\s+Trade-?offs/i)) {
                inTradeoffs = true;
                continue;
            }
            if (inTradeoffs && line.startsWith('##')) {
                break;
            }
            if (inTradeoffs && line.trim() && !line.startsWith('#')) {
                tradeoffs.push(line.trim());
            }

            // Also extract from IMPORTANT/WARNING alerts
            if (line.match(/>\s*\[!(IMPORTANT|WARNING|CAUTION)\]/)) {
                const nextLineIdx = lines.indexOf(line) + 1;
                if (nextLineIdx < lines.length) {
                    const alertContent = lines[nextLineIdx].replace(/^>\s*/, '').trim();
                    if (alertContent) {
                        tradeoffs.push(alertContent);
                    }
                }
            }
        }

        return tradeoffs;
    }

    /**
     * Extract constraints from implementation plan.
     * Looks for "Requirements" or "Constraints" sections.
     */
    private extractConstraints(planContent: string): string[] {
        if (!planContent) return [];

        const constraints: string[] = [];
        const lines = planContent.split('\n');

        let inConstraints = false;
        for (const line of lines) {
            if (line.match(/^##\s+(Requirements|Constraints)/i)) {
                inConstraints = true;
                continue;
            }
            if (inConstraints && line.startsWith('##')) {
                break;
            }
            if (inConstraints && line.trim() && !line.startsWith('#')) {
                constraints.push(line.trim());
            }
        }

        return constraints;
    }

    /**
     * Build raw notes from full artifact content.
     * Used as fallback if structured parsing doesn't capture everything.
     */
    private buildRawNotes(taskContent: string, planContent: string): string {
        const notes: string[] = [];

        if (taskContent) {
            notes.push('=== Task Status ===');
            notes.push(taskContent);
        }

        if (planContent) {
            notes.push('\n=== Implementation Plan ===');
            notes.push(planContent);
        }

        return notes.join('\n');
    }

    /**
     * Calculate confidence score based on artifact availability and content.
     * 
     * @param artifactCount Number of artifacts found (0-2)
     * @param taskContent Content of task.md
     * @param planContent Content of implementation_plan.md
     * @returns Confidence score between 0 and 1
     */
    private calculateConfidence(
        artifactCount: number,
        taskContent: string,
        planContent: string
    ): number {
        if (artifactCount === 0) return 0;

        let confidence = artifactCount / 2; // Base: 0.5 for one artifact, 1.0 for both

        // Boost if content is substantial
        const totalLength = taskContent.length + planContent.length;
        if (totalLength > 1000) {
            confidence = Math.min(1.0, confidence + 0.1);
        }

        // Reduce if content is too sparse
        if (totalLength < 100) {
            confidence *= 0.5;
        }

        return confidence;
    }
}
