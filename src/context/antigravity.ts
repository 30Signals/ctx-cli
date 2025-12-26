import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface AntigravityContext {
    sessionId: string;
    taskContent: string;
    planContent: string;
}

const BRAIN_DIR = 'C:/Users/katro/.gemini/antigravity/brain';

export async function getAntigravityContext(): Promise<AntigravityContext | null> {
    try {
        // Find all session directories
        const sessionDirs = await glob(`${BRAIN_DIR}/*/`);

        if (sessionDirs.length === 0) {
            console.warn('No Antigravity sessions found.');
            return null;
        }

        // Sort by modification time (newest first)
        const sortedSessions = sessionDirs.map(dir => ({
            path: dir,
            mtime: fs.statSync(dir).mtime.getTime()
        })).sort((a, b) => b.mtime - a.mtime);

        const latestSessionDir = sortedSessions[0].path;
        const sessionId = path.basename(latestSessionDir);

        console.log(`Using Antigravity session: ${sessionId}`);

        // Read artifacts
        let taskContent = '';
        let planContent = '';

        try {
            taskContent = fs.readFileSync(path.join(latestSessionDir, 'task.md'), 'utf-8');
        } catch (e) {
            console.warn('task.md not found in latest session.');
        }

        try {
            planContent = fs.readFileSync(path.join(latestSessionDir, 'implementation_plan.md'), 'utf-8');
        } catch (e) {
            console.warn('implementation_plan.md not found in latest session.');
        }

        return {
            sessionId,
            taskContent,
            planContent
        };

    } catch (error) {
        console.error('Error retrieving Antigravity context:', error);
        return null;
    }
}
