/**
 * Clones the project's GitHub wiki into ./wiki, or fast-forwards it if it's
 * already there. The wiki is a separate repository, so it's gitignored here and
 * committed and pushed on its own; see CLAUDE.md's "Keep the contributor wiki
 * in sync". A script rather than a shell one-liner so the first run doesn't
 * greet a newcomer with git's "fatal:" from a failed pull.
 */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const URL = 'https://github.com/wordplaydev/wordplay.wiki.git';
const DIR = 'wiki';

function git(args: string[]) {
    const { status } = spawnSync('git', args, { stdio: 'inherit' });
    if (status !== 0) process.exit(status ?? 1);
}

if (existsSync(join(DIR, '.git'))) {
    console.log(`Updating the wiki in ./${DIR} …`);
    git(['-C', DIR, 'pull', '--ff-only']);
} else if (existsSync(DIR)) {
    console.error(
        `./${DIR} exists but isn't a git repository. Move or delete it, then run this again.`,
    );
    process.exit(1);
} else {
    console.log(`Cloning the wiki into ./${DIR} …`);
    git(['clone', URL, DIR]);
}
