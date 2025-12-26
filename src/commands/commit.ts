import { getStagedDiff } from '../context/git';
import { getAntigravityContext } from '../context/antigravity';
import { getOpenAIClient } from '../ai/client';

export async function generateCommitMessage() {
    // 1. Get Staged Diff
    const diff = await getStagedDiff();
    if (!diff) {
        console.error('No staged changes found. Please stage files with "git add" first.');
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
You are a senior developer's assistant. Your goal is to write a semantic git commit message.
You have access to the code changes (DIFF) and the high-level intent/planning documents (CONTEXT).

Output Format:
<type>(<scope>): <subject>

<body>

<footer>

Rules:
1. Use the Context to understand *WHY* changes were made (Intent).
2. Use the Diff to understand *WHAT* changed (Implementation).
3. Be concise but descriptive. 
4. If the Context mentions "User Review Required" or "Trade-offs", include that in the body.
`;

    const userPrompt = `
CONTEXT:
${promptContext}

DIFF:
${diff}

Generate the commit message.
`;

    // 4. Call AI
    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'gpt-4-turbo-preview', // Or appropriate model
        });

        console.log('\n--- Generated Commit Message ---\n');
        console.log(completion.choices[0].message.content);
        console.log('\n--------------------------------\n');

    } catch (error: any) {
        console.error('Error generating commit message:', error.message);
        if (error.message.includes('OPENAI_API_KEY')) {
            console.error('Please ensure OPENAI_API_KEY is set in your .env file or environment.');
        }
    }
}
