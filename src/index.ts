#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { generateCommitMessage } from './commands/commit';
import { generatePRDescription } from './commands/pr';

dotenv.config();

const program = new Command();

program
    .name('ctx')
    .description('Context CLI - AI-powered commit and PR generation')
    .version('1.0.0');

program
    .command('commit')
    .description('Generate a context-aware commit message')
    .option('--no-tradeoffs', 'Omit the Trade-offs section')
    .option('--ai-attribution', 'Include AI attribution footer')
    .option('--dry-run', 'Print message and exit')
    .option('-a, --all', 'Stage all changes before committing')
    .option('-c, --context <text>', 'Additional context to include in generation')
    .action(async (options) => {
        await generateCommitMessage(options);
    });

program
    .command('pr')
    .description('Generate a context-aware PR description')
    .option('--no-tradeoffs', 'Omit the Trade-offs section')
    .option('--ai-attribution', 'Include AI attribution footer')
    .option('--dry-run', 'Print message and exit')
    .option('-c, --context <text>', 'Additional context to include in generation')
    .action(async (options) => {
        await generatePRDescription(options);
    });

program.parse(process.argv);
