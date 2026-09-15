import { NamedKeys, type Command } from '@components/editor/commands/Commands';

/**
 * The conventions every command table is held to, exported so the markup
 * editor's list is held to the same ones — a second table is exactly where they
 * would quietly lapse, and three of the four defects these close had already
 * been fixed once in one table and missed in the other.
 *
 * These are unit tests by necessity, not by preference. Playwright cannot make
 * this claim: `buildLayoutClosure` in playwright-core stores the `'z'` alias
 * without a `.shifted` descriptor, so `press('Control+Shift+z')` delivers
 * `key: 'z'` — a keystroke no real browser produces, since a real Shift+z is
 * `'Z'`. An e2e test of a shifted-letter chord therefore certifies a binding
 * that may not work for anyone. Do not "strengthen" these by moving them.
 */

/** A command's chord, as a string, for comparing two of them. `undefined` is a
 *  third state and must not collapse into `false`: it means "either". */
export function chordKey(command: Command): string {
    return [
        command.control === undefined ? '?' : command.control ? 'C' : '-',
        command.alt === undefined ? '?' : command.alt ? 'A' : '-',
        command.shift === undefined ? '?' : command.shift ? 'S' : '-',
        command.key,
    ].join('|');
}

/** A readable name for a command in a failure message. */
export function commandName(command: Command): string {
    return command.uiid ?? command.symbol;
}

/**
 * Two commands collide when one's modifier is `undefined` where the other's is
 * `true` or `false` on the same key — `handleKeyCommand` takes the first match,
 * so the later one is unreachable for the keystrokes they share. A plain string
 * comparison misses this, and it is what made `≥` unreachable behind `·`.
 */
export function chordsOverlap(a: Command, b: Command): boolean {
    if (a.key !== b.key || a.key === undefined) return false;
    const agrees = (x: boolean | undefined, y: boolean | undefined) =>
        x === undefined || y === undefined || x === y;
    return (
        agrees(a.control, b.control) &&
        agrees(a.alt, b.alt) &&
        agrees(a.shift, b.shift)
    );
}

/**
 * Pairs that share a chord on purpose, because the earlier one answers `false`
 * for the keystrokes the later one wants and `handleKeyCommand` keeps scanning.
 *
 * That is not something a test can see — whether a command *always* succeeds is
 * a fact about its `execute` — so each pair is declared here with its reason,
 * which puts it in front of a reviewer. The device is the same one
 * `Commands.test.ts` uses to enumerate the commands claiming external feedback.
 *
 * The defect this list exists to keep out: `·` and `≥` both claimed Alt+. and
 * `·` inserts unconditionally, so `≥` could never fire from the keyboard.
 */
export const DeclaredShadows: readonly [string, string, string][] = [
    [
        '←☐',
        '⬉',
        'expanding a selection declines in blocks mode, where extending by node is what Shift+Left means',
    ],
    ['☐→', '⬈', 'the same, rightward'],
    [
        '↑',
        'exitFullscreen',
        'selecting a parent declines when there is no parent to select, and then Escape leaves fullscreen',
    ],
];

function isDeclaredShadow(a: Command, b: Command): boolean {
    return DeclaredShadows.some(
        ([first, second]) =>
            commandName(a) === first && commandName(b) === second,
    );
}

/** Every pair of commands in a list whose chords can both match one keystroke,
 *  minus the pairs declared above. */
export function overlappingChords(commands: Command[]): string[] {
    const keyed = commands.filter((c) => c.key !== undefined);
    const pairs: string[] = [];
    for (let i = 0; i < keyed.length; i++)
        for (let j = i + 1; j < keyed.length; j++) {
            const a = keyed[i];
            const b = keyed[j];
            if (
                a !== undefined &&
                b !== undefined &&
                chordsOverlap(a, b) &&
                !isDeclaredShadow(a, b)
            )
                pairs.push(
                    `${commandName(a)} and ${commandName(b)} both claim ${chordKey(a)}`,
                );
        }
    return pairs;
}

/**
 * A `key` is either a named key or the single character the key types unshifted
 * on a US layout, lowercase for letters — never a `KeyboardEvent.code`. See the
 * `key` field's own documentation for why the character comes first.
 */
export function invalidKeys(commands: Command[]): string[] {
    return commands
        .filter((command) => {
            const key = command.key;
            if (key === undefined) return false;
            if (NamedKeys.has(key)) return false;
            // A code, spelled as one. These all used to be in the table, and
            // each one is a chord that fires on the wrong physical key, or on a
            // key the creator cannot see.
            if (/^(Key|Digit|Numpad|Arrow)/.test(key)) return true;
            if (
                [
                    'Slash',
                    'Comma',
                    'Period',
                    'Minus',
                    'Equal',
                    'Semicolon',
                    'Backslash',
                    'Quote',
                    'Backquote',
                    'BracketLeft',
                    'BracketRight',
                    'Space',
                ].includes(key)
            )
                return true;
            // Otherwise it must be exactly one character, and not an uppercase
            // letter: `'J'` matched nothing, because a keystroke's key is `'j'`
            // unless Shift is down and `'J'` declared shift disqualifying.
            return key.length !== 1 || key !== key.toLowerCase();
        })
        .map(
            (command) =>
                `${commandName(command)} declares key '${command.key}'`,
        );
}

/**
 * Control and Alt together is not a chord anyone can safely have.
 *
 * On Windows and Linux, AltGr *is* Control+Alt — `getModifierState('AltGraph')`
 * is documented as "Both Alt and Ctrl keys are pressed, or AltGraph key is
 * pressed" — so on every European layout where AltGr types a character, such a
 * command eats the character the creator wanted. GNOME takes Ctrl+Alt+Arrow for
 * switching workspaces and Ctrl+Alt+Shift+Arrow for moving a window between
 * them. ChromeOS *remaps* Ctrl+Alt+Up/Down to Home/End before the page sees
 * them, and Chromebooks are what a school has. And Windows takes Ctrl+Alt+Tab
 * for its persistent task switcher, which is the collision #826 was filed about.
 *
 * Banning the pair is also what makes an `AltGraph` guard unnecessary: AltGr can
 * only ever reach a command that accepts control and alt together, and with this
 * rule none does. Hence the second assertion — a command declaring `control:
 * undefined` would accept AltGr through the back door.
 */
export function reservedChords(commands: Command[]): string[] {
    return commands
        .filter((command) => command.key !== undefined)
        .flatMap((command) => {
            const name = commandName(command);
            const problems: string[] = [];
            if (command.control === true && command.alt === true)
                problems.push(`${name} uses Control+Alt, which is AltGr`);
            if (command.control === undefined)
                problems.push(
                    `${name} leaves control undefined, so AltGr reaches it`,
                );
            // Every Tab chord belongs to an OS or the browser.
            if (command.key === 'Tab')
                problems.push(
                    `${name} uses Tab, which the OS and browser take`,
                );
            return problems;
        });
}
