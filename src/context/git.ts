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
