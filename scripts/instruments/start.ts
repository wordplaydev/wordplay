/**
 * CLI for the instrument pipeline, mirroring `scripts/fonts/start.ts`.
 *
 *   npm run instruments        verify the shipped zones match the lockfile
 *   npm run instruments-build  fetch, process, and write the zones
 */

import chalk from 'chalk';
import { build } from './build';
import { verifyAll } from './verify';

async function verify() {
    const problems = await verifyAll();
    if (problems.length === 0) {
        console.log(chalk.green('✓ Instrument zones match the lockfile.'));
        return;
    }
    for (const problem of problems.slice(0, 40))
        console.log(chalk.red('    x ' + problem));
    if (problems.length > 40)
        console.log(chalk.red(`    …and ${problems.length - 40} more`));
    console.log(
        chalk.yellow('Run `npm run instruments-build` to regenerate them.'),
    );
    process.exit(1);
}

async function rebuild() {
    console.log('Building instrument zones…');
    const problems = await build();
    for (const problem of problems) console.log(chalk.yellow('    ! ' + problem));
    const remaining = await verifyAll();
    if (remaining.length > 0) {
        for (const problem of remaining.slice(0, 40))
            console.log(chalk.red('    x ' + problem));
        process.exit(1);
    }
    console.log(chalk.green('✓ Built and verified.'));
}

const command = process.argv[2] ?? 'verify';
if (command === 'build') await rebuild();
else await verify();
