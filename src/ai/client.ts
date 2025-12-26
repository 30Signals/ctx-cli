import OpenAI from 'openai';

export function getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }
    return new OpenAI({ apiKey });
}

export function getModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}
