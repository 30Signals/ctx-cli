import { getBranchDiff } from '../context/git';
import { getAntigravityContext } from '../context/antigravity';
import { getOpenAIClient } from '../ai/client';

export async function generatePRDescription() {
    // 1. Get Branch Diff
    // Defaulting to 'main', could be configurable
    const diff = await getBranchDiff('main');
    if (!diff) {
        console.error('No changes found between HEAD and main.');
        return;
    }

    // 2. Get AI Context
    const context = await getAntigravityContext();

    // 3. Construct Prompt
    let promptContext = '';
    if (context) {
        promptContext = `
ANTIGRAVITY CONTEXT:
Task Status:
${context.taskContent}

Implementation Plan:
${context.planContent}
`;
    } else {
        promptContext = 'No active AI session context found. Rely solely on the diff.';
    }

    const systemPrompt = `
You are a senior developer's assistant. Your goal is to write a Pull Request description in Markdown.

Structure:
# Title (Feat/Fix: ...)

## Summary
(High level overview)

## Intent
(Clusters of changes using the provided Context)
- Refactor: ... because ...
- Fix: ... detected in ...

## Changes
(Bulleted list of technical changes)

## Trade-offs / Decisions
(Extracted from Context)

`;

    const userPrompt = `
CONTEXT:
${promptContext}

DIFF:
${diff}

Generate the PR description.
`;

    // 4. Call AI
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'gpt-4-turbo-preview',
        });

        console.log('\n--- Generated PR Description ---\n');
        console.log(completion.choices[0].message.content);
        console.log('\n--------------------------------\n');

    } catch (error: any) {
        console.error('Error generating PR description:', error.message);
        if (error.message.includes('OPENAI_API_KEY')) {
            console.error('Please ensure OPENAI_API_KEY is set in your .env file or environment.');
        }
    }
}
