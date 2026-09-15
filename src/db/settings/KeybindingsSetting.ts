import Setting from '@db/settings/Setting';
import { z } from 'zod';

/**
 * A creator's keyboard shortcut overrides, and the rules that decide what a
 * chord may be.
 *
 * Why this exists: no single set of defaults is right for everyone. The same
 * chord is free on macOS, is AltGr on a German Windows laptop, switches
 * workspaces on GNOME, and *is* the Home key on a Chromebook — and Wordplay
 * ships to classrooms where all four sit in one room. Removing Control+Alt
 * fixed the sixteen collisions we knew about; it cannot make the next binding
 * safe on a keyboard we have never seen.
 *
 * Everything here is pure and imports only `Setting`, so a page that merely
 * *renders* a shortcut doesn't drag the command table onto its import graph.
 */

/** The shape of a chord, matching the modifier fields on `Command`. */
export type Chord = {
    key?: string | undefined;
    shift?: boolean | undefined;
    alt?: boolean | undefined;
    control?: boolean | undefined;
};

/** A creator's overrides, by command id. `null` means "no chord at all", which
 *  is different from absent (absent means "use the default"). */
export type Keybindings = Record<string, Chord | null>;

const ChordSchema = z.object({
    key: z.string().optional(),
    shift: z.boolean().optional(),
    alt: z.boolean().optional(),
    control: z.boolean().optional(),
});

/**
 * Parsed one entry at a time on purpose: a single malformed chord drops itself
 * rather than throwing away every other binding the creator set.
 */
function parseKeybindings(value: unknown): Keybindings | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return undefined;
    const out: Keybindings = {};
    for (const [id, chord] of Object.entries(value)) {
        if (chord === null) {
            out[id] = null;
            continue;
        }
        const parsed = ChordSchema.safeParse(chord);
        if (parsed.success) out[id] = parsed.data;
    }
    return out;
}

/**
 * Account-synced, not device-local. A keybinding is a fact about the person —
 * the layout they type on, the hand they have — and the creators this was built
 * for share school Chromebooks, where a device-local map is worth nothing.
 */
export const KeybindingsSetting = new Setting<Keybindings>(
    'keybindings',
    false,
    {},
    parseKeybindings,
    (current, value) => JSON.stringify(current) === JSON.stringify(value),
);

/** Whether two chords would answer to the same keystroke. */
export function sameChord(a: Chord, b: Chord): boolean {
    return (
        a.key === b.key &&
        (a.shift ?? false) === (b.shift ?? false) &&
        (a.alt ?? false) === (b.alt ?? false) &&
        (a.control ?? false) === (b.control ?? false)
    );
}

/** The chord a command answers to, after the creator's overrides. */
export function chordOf<C extends { id: string } & Chord>(
    command: C,
    overrides: Keybindings,
): Chord {
    const override = overrides[command.id];
    if (override === undefined) return command;
    // An explicit null is "I don't want a chord for this".
    return override ?? { key: undefined };
}

/**
 * The command list with overrides applied.
 *
 * Returns the input array *identically* when nothing is overridden, which is the
 * overwhelming case — this runs on every keydown, so the default path must not
 * allocate. Memoizing the other case is left to the caller, which knows the
 * concrete command type; doing it here would mean storing a generic array in a
 * WeakMap and casting it back out.
 */
export function effectiveChords<C extends { id: string } & Chord>(
    commands: C[],
    overrides: Keybindings,
): C[] {
    if (Object.keys(overrides).length === 0) return commands;
    return commands.map((command) =>
        overrides[command.id] === undefined
            ? command
            : { ...command, ...chordOf(command, overrides) },
    );
}

/**
 * Chords an OS or browser takes before a page ever sees them, each with the
 * platform that takes it — which is the only reason to keep the entry.
 *
 * Control+Alt is the whole first rule: AltGr *is* Control+Alt on Windows and
 * Linux, GNOME takes Ctrl+Alt+Arrow for workspaces, ChromeOS remaps
 * Ctrl+Alt+Up/Down to Home/End, and Windows takes Ctrl+Alt+Tab for its task
 * switcher. Refusing the pair is also what makes a `getModifierState('AltGraph')`
 * guard unnecessary.
 */
export type Reservation = 'controlAlt' | 'tab' | 'browser' | 'unmodified';

const BrowserReserved = new Set([
    't',
    'n',
    'w',
    'q',
    'i',
    'j',
    'c',
    'b',
    'o',
    'p',
    'r',
    'd',
]);

export function reservationFor(chord: Chord): Reservation | undefined {
    if (chord.key === undefined) return undefined;
    if (chord.control === true && chord.alt === true) return 'controlAlt';
    if (chord.key === 'Tab') return 'tab';
    if (
        chord.control === true &&
        chord.shift === true &&
        BrowserReserved.has(chord.key.toLowerCase())
    )
        return 'browser';
    // A chord with no Control and no Alt is typing, not a shortcut.
    if (chord.control !== true && chord.alt !== true) return 'unmodified';
    return undefined;
}

/**
 * Which commands a creator may rebind, derived rather than declared: one whose
 * default chord requires Control or Alt, or which has no chord at all.
 *
 * That excludes exactly the typing and caret surface — the typing catch-all,
 * Backspace, Delete, Enter, Escape, the bare `(`/`[` wrappers, and every plain
 * or shifted arrow — and includes every palette-only insert, which is the point:
 * those are the symbols students said they could not type.
 */
export function isRemappable(
    command: Chord & { typing?: boolean | undefined },
): boolean {
    if (command.typing === true) return false;
    if (command.key === undefined) return true;
    return command.control === true || command.alt === true;
}

/** The id of a command already answering to this chord, if any. A creator's
 *  chord is refused rather than stolen: taking it would leave the other command
 *  unreachable with nothing saying so. */
export function conflictFor<C extends { id: string } & Chord>(
    chord: Chord,
    id: string,
    commands: C[],
    overrides: Keybindings,
): string | undefined {
    for (const command of commands) {
        if (command.id === id) continue;
        const existing = chordOf(command, overrides);
        if (existing.key !== undefined && sameChord(existing, chord))
            return command.id;
    }
    return undefined;
}

/**
 * The current overrides, latched from the store at module load.
 *
 * `handleKeyCommand` runs on every keydown and loops ~138 commands; subscribing
 * per keystroke — or per command — would put a store read in that loop for a map
 * that is empty for almost everyone. The subscription is set up once here and
 * the value is read synchronously.
 */
let current: Keybindings = {};
KeybindingsSetting.value.subscribe((value) => {
    current = value;
});

export function currentKeybindings(): Keybindings {
    return current;
}
