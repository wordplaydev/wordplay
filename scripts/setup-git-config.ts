// Sets repo-local Git settings that make conflicts in the locale JSON files
// tractable. Run from `postinstall`, so contributors get them without a setup step.
//
// The locale files are large, densely edited, and machine-retranslated in bulk, so
// a contributor branch that is a couple of months stale conflicts on nearly every
// string it touches. Git merges them correctly — disjoint edits merge clean — but
// the default presentation hides why a conflict happened, and rebasing replays it
// once per commit. These two settings address that:
//
//   merge.conflictstyle=zdiff3  includes the common ancestor in the conflict block,
//                               so it's visible that main rewrote the string too,
//                               rather than looking like unrelated lines appeared.
//   rerere.enabled=true         records a resolution and replays it, so the same
//                               conflict isn't resolved by hand at every stop.
//
// Never fails the install: no git, no work tree (tarball/zip checkout), or a
// read-only config are all normal situations that must not break `npm install`.

import { execFileSync } from 'child_process';

/** Repo-local settings to apply, each with the reason it exists. */
const SETTINGS: { key: string; value: string; why: string }[] = [
    {
        key: 'merge.conflictstyle',
        value: 'zdiff3',
        why: 'show the common ancestor in conflicts',
    },
    {
        key: 'rerere.enabled',
        value: 'true',
        why: 'reuse conflict resolutions across rebase steps',
    },
];

function git(args: string[]): string | undefined {
    try {
        return execFileSync('git', args, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return undefined;
    }
}

function setup() {
    if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') {
        console.log('Not a Git work tree; skipping Git config setup.');
        return;
    }

    for (const { key, value, why } of SETTINGS) {
        // Idempotent: leave any existing value alone so a contributor who
        // deliberately chose a different setting doesn't get it overwritten
        // on every install.
        const current = git(['config', '--local', '--get', key]);
        if (current !== undefined) {
            if (current !== value)
                console.log(`Leaving ${key}=${current} as configured.`);
            continue;
        }
        if (git(['config', '--local', key, value]) === undefined)
            console.warn(`Could not set ${key}; skipping.`);
        else console.log(`Set ${key}=${value} to ${why}.`);
    }
}

setup();
