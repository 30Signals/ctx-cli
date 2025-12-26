import OpenAI from 'openai';

export function getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }
    return new OpenAI({ apiKey });
}
