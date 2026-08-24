import { spawn } from 'child_process';

/**
 * Start the Firebase emulator suite with a real heap ceiling.
 *
 * The Firestore emulator holds every document and index in memory, and the JVM
 * defaults its maximum heap to a quarter of physical RAM. On a long-lived
 * session that ceiling gets reached rather than exceeded, and the failure is
 * silent: the collector runs continuously without reclaiming anything, so the
 * emulator stops answering while pinning every core. One left running for eight
 * hours sat at 99.5% old-gen occupancy having spent seventeen minutes in full
 * GC, at ~930% CPU, with no client connected — and it had to be SIGKILLed,
 * because a JVM in that state can't run its own shutdown hooks.
 *
 * `ExitOnOutOfMemoryError` is the point of this file: it turns that stall into a
 * process that dies and says why. The lower ceiling just gets there sooner.
 *
 * A wrapper rather than an inline `JAVA_TOOL_OPTIONS=… ` in package.json,
 * because the setup instructions send Windows contributors to PowerShell, which
 * doesn't understand that syntax.
 */

/** Roughly a day of ordinary local data, and well under the 6GB a 24GB machine
 *  would otherwise allow itself. Raise it if a legitimate session ever dies. */
const MaxHeap = '4g';

const options = [
    `-Xmx${MaxHeap}`,
    '-XX:+ExitOnOutOfMemoryError',
    // Keep anything the caller already set; ours win, being later.
    process.env.JAVA_TOOL_OPTIONS,
]
    .filter((option) => option !== undefined && option !== '')
    .reverse()
    .join(' ');

const child = spawn(
    'firebase',
    ['emulators:start', '--project=demo-wordplay', ...process.argv.slice(2)],
    {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, JAVA_TOOL_OPTIONS: options },
    },
);

child.on('exit', (code, signal) => {
    // Surface the emulator's own exit status, so an out-of-memory death is a
    // failed command rather than a silent stop.
    if (signal !== null) process.exit(1);
    process.exit(code ?? 0);
});
