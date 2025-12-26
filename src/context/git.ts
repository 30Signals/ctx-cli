import simpleGit from 'simple-git';

const git = simpleGit();

export async function getStagedDiff(): Promise<string> {
    const diff = await git.diff(['--staged']);
    return diff;
}

export async function getBranchDiff(baseBranch: string = 'main'): Promise<string> {
    const diff = await git.diff([baseBranch]);
    return diff;
}

export async function hasUnstagedChanges(): Promise<boolean> {
    const status = await git.diff(['--name-only']);
    // If output is not empty, there are unstaged changes (modified/deleted)
    // We also check for untracked files
    const untracked = await git.status();
    return status.trim().length > 0 || untracked.not_added.length > 0;
}

export async function stageAll(): Promise<void> {
    await git.add('.');
}
