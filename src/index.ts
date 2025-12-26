#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { generateCommitMessage } from './commands/commit';
import { generatePRDescription } from './commands/pr';

dotenv.config();

const program = new Command();

program
    .name('ctx')
    .description('Antigravity Context CLI - AI-powered commit and PR generation')
    .version('1.0.0');

program
    .command('commit')
    .description('Generate a context-aware commit message')
    .action(async () => {
        await generateCommitMessage();
    });

program
    .command('pr')
    .description('Generate a context-aware PR description')
    .action(async () => {
        await generatePRDescription();
    });

program.parse(process.argv);
